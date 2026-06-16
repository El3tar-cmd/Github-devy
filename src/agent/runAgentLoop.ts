import { ChatMessage, Settings, ChatSession } from "../types";
import { executeToolCall } from "../ollama";
import { TOOLS_SCHEMA } from "./tools/toolsSchema";
import { submitGeminiRequest } from "../geminiApi";
import { summarizeHistory } from "./summarizeHistory";

interface RunAgentLoopParams {
  currentMessages: ChatMessage[];
  updateLog: (updater: ChatMessage[] | ((p: ChatMessage[]) => ChatMessage[])) => void;
  settings: Settings;
  workspaceId: string;
  sessionsRef: React.MutableRefObject<ChatSession[]>;
  currentSessionId: string;
  setSessions: React.Dispatch<React.SetStateAction<ChatSession[]>>;
  abortControllerRef: React.MutableRefObject<AbortController | null>;
  onSettingsUpdate?: (s: Partial<Settings>, newWorkspaceId?: string) => void;
  setIsRunning: (isRunning: boolean) => void;
}

function sanitizeMessagesForLLM(msgs: ChatMessage[]): ChatMessage[] {
  return msgs.map((m) => {
    if (m.toolInvocations) {
      const sanitizedInvs = m.toolInvocations.map((inv) => {
        if (inv.name === "browser_screenshot" && inv.result) {
          try {
            const parsed = JSON.parse(inv.result);
            if (parsed.screenshot) {
              parsed.screenshot = "[IMAGE DATA DETACHED - VIEW NATIVELY IN IDE CHAT VIEW]";
              return {
                ...inv,
                result: JSON.stringify(parsed)
              };
            }
          } catch (e) {
            // fallback
          }
        }
        return inv;
      });
      return {
        ...m,
        toolInvocations: sanitizedInvs
      };
    }
    return m;
  });
}

export async function runAgentLoop({
  currentMessages,
  updateLog,
  settings,
  workspaceId,
  sessionsRef,
  currentSessionId,
  setSessions,
  abortControllerRef,
  onSettingsUpdate,
  setIsRunning,
}: RunAgentLoopParams) {
  setIsRunning(true);
  let iterMessages = [...currentMessages];

  // Create new abort controller
  const ac = new AbortController();
  abortControllerRef.current = ac;

  let historySummary = "";
  let summarizedCount = 0;

  const activeSession = sessionsRef.current.find((s) => s.id === currentSessionId);
  if (activeSession) {
    historySummary = activeSession.historySummary || "";
    summarizedCount = activeSession.summarizedCount || 0;
  }

  if (iterMessages.length > 8) {
    const toSummarize = iterMessages.slice(0, -6);
    if (toSummarize.length > summarizedCount) {
      try {
        const contextToSummarize = [...toSummarize];
        if (historySummary) {
          contextToSummarize.unshift({
            id: "prev-summary",
            role: "system",
            content: `Here is a summary of the conversation before these messages:\n${historySummary}`,
          });
        }
        const newSummary = await summarizeHistory(contextToSummarize, settings, ac.signal);
        if (newSummary) {
          historySummary = newSummary;
          summarizedCount = toSummarize.length;

          setSessions((prev) =>
            prev.map((s) =>
              s.id === currentSessionId
                ? { ...s, historySummary: newSummary, summarizedCount: toSummarize.length }
                : s
            )
          );
        }
      } catch (sumErr) {
        console.error("Failed to generate history summary:", sumErr);
      }
    }
  }

  const MAX_ITERATIONS = 30;
  let iterationCounter = 0;

  try {
    while (true) {
      if (ac.signal.aborted) throw new Error("Aborted by user.");
      
      iterationCounter++;
      if (iterationCounter > MAX_ITERATIONS) {
        throw new Error(`تعذر إكمال العملية: تم تجاوز الحد الأقصى للتكرار المسموح به (${MAX_ITERATIONS}) لتجنب الحلقات اللانهائية.`);
      }

      let planContext = "";
      if (settings.planModeActive && workspaceId) {
        try {
          const planRes = await fetch("/api/fs/read", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path: ".github-devy/plan.md", workspaceId }),
          });
          const tasksRes = await fetch("/api/fs/read", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path: ".github-devy/tasks.md", workspaceId }),
          });

          let planText = "";
          let tasksText = "";
          if (planRes.ok) {
            const planData = await planRes.json();
            planText = planData.content || "";
          }
          if (tasksRes.ok) {
            const tasksData = await tasksRes.json();
            tasksText = tasksData.content || "";
          }

          if (planText || tasksText) {
            planContext = `\n\n[PLAN MODE IS ACTIVE - CRITICAL DIRECTIVE]:
You must strictly follow the plan and check off tasks as you complete them.
Here is the current plan (stored in ".github-devy/plan.md"):
=== START OF PLAN ===
${planText || "(No plan constructed yet)"}
=== END OF PLAN ===

Here is the current task checklist (stored in ".github-devy/tasks.md"):
=== START OF TASKS ===
${tasksText || "(No tasks checklist constructed yet)"}
=== END OF TASKS ===

Instructions for updating the plan and tasks:
1. When you complete a task or a step, you MUST immediately update the checklist in ".github-devy/tasks.md" by modifying the file using 'write_file' or 'replace_in_file' to mark it as completed (change "- [ ]" to "- [x]").
2. If the plan needs to be revised or detailed further, write the updated version to ".github-devy/plan.md".
3. Always check off the current step before proceeding to the next step.
4. Let the user know which step you are currently executing and when you mark it as completed.`;
          }
        } catch (err) {
          console.error("Failed to fetch plan/tasks for prompt injection:", err);
        }
      }

      const baseSystemPrompt = settings.systemPrompt || "You are Devy, an AI coding assistant.";
      
      const activeProjectContext = workspaceId
        ? `\n\n[ACTIVE WORKSPACE CONTEXT]:
- Active Project Folder Name: "${workspaceId}"
- Workspace Path: "./" (All your file system and terminal tools run relative to this folder)
- Project Absolute Path on device: "/data/data/com.termux/files/home/Github-devy/.agent_workspace/${workspaceId}"`
        : "";

      const systemPrompt = (historySummary
        ? `${baseSystemPrompt}\n\n[CONVERSATION HISTORY SUMMARY - READ THIS TO KNOW WHAT HAPPENED BUT DO NOT MENTION IT TO USER UNLESS RELEVANT]:\n${historySummary}`
        : baseSystemPrompt) + activeProjectContext + planContext;

      const messagesToSend = sanitizeMessagesForLLM(summarizedCount > 0 ? iterMessages.slice(summarizedCount) : iterMessages);

      let responseMsg: any;
      let inputTokens = 0;
      let outputTokens = 0;
      let costUsd = 0;

      if (settings.apiProvider === "gemini") {
        const data = await submitGeminiRequest(
          settings.geminiApiKey || "",
          settings.geminiModel || "gemini-2.5-flash",
          systemPrompt,
          messagesToSend,
          ac.signal,
        );
        responseMsg = data.message;
        inputTokens = (data as any).inputTokens || 0;
        outputTokens = (data as any).outputTokens || 0;
        costUsd = (data as any).costUsd || 0;
      } else {
        // Ollama Flow
        const payloadMessages = [
          { role: "system", content: systemPrompt },
          ...messagesToSend.flatMap<any>((m) => {
            if (m.role === "tool") {
              return (
                m.toolInvocations?.map((inv) => ({
                  role: "tool",
                  content: inv.result,
                  name: inv.name,
                })) || []
              );
            }
            if (m.role === "assistant" && m.toolInvocations?.length) {
              return [
                {
                  role: "assistant",
                  content: m.content || "",
                  tool_calls: m.toolInvocations.map((inv) => ({
                    type: "function",
                    function: {
                      name: inv.name,
                      arguments: inv.args,
                    },
                  })),
                },
              ];
            }
            return [{ role: m.role, content: m.content || "" }];
          }),
        ];

        const baseUrl = settings.ollamaUrl.replace(/\/+$/, "");
        const res = await fetch(`${baseUrl}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: settings.ollamaModel,
            messages: payloadMessages,
            stream: false,
            tools: TOOLS_SCHEMA,
            options: {
              num_predict: 4096,
              temperature: 0.7
            }
          }),
          signal: ac.signal,
        });

        if (!res.ok) {
          throw new Error(
            `API Error: ${(await res.text()).substring(0, 500)}`,
          );
        }

        const data = await res.json();
        responseMsg = data.message;
        inputTokens = data.prompt_eval_count || 0;
        outputTokens = data.eval_count || 0;
        costUsd = 0;
      }

      if (responseMsg.tool_calls && responseMsg.tool_calls.length > 0) {
        const rawInvs = responseMsg.tool_calls;
        const invocations = rawInvs.map((tc: any) => ({
          id: Math.random().toString(36).substring(7),
          name: tc.function.name,
          args: tc.function.arguments,
          status: "running" as const,
        }));

        const asstMsg: ChatMessage = {
          id: Math.random().toString(36),
          role: "assistant",
          content: responseMsg.content || "",
          toolInvocations: invocations,
          geminiParts: responseMsg.geminiParts,
          inputTokens,
          outputTokens,
          costUsd
        };

        updateLog((prev) => [...prev, asstMsg]);
        iterMessages = [...iterMessages, asstMsg];

        const completedInvocations = [...invocations];

        for (let i = 0; i < completedInvocations.length; i++) {
          const inv = completedInvocations[i];
          try {
            if (ac.signal.aborted) throw new Error("Aborted by user.");
            const result = await executeToolCall(
              inv.name,
              inv.args,
              workspaceId,
              settings,
              (chunkStr) => {
                completedInvocations[i].result =
                  typeof chunkStr === "string"
                    ? chunkStr
                    : JSON.stringify(chunkStr);
                updateLog((prev) => {
                  const copy = [...prev];
                  const msgIdx = copy.findIndex((m) => m.id === asstMsg.id);
                  if (msgIdx !== -1) {
                    copy[msgIdx] = {
                      ...copy[msgIdx],
                      toolInvocations: [...completedInvocations],
                    };
                  }
                  return copy;
                });
              },
              ac.signal,
            );
            completedInvocations[i].result =
              typeof result === "string" ? result : JSON.stringify(result);
            completedInvocations[i].status = "success";
            if (inv.name === "clone_git_repository") {
              if (result && (result.success || !result.error)) {
                onSettingsUpdate?.(
                  {
                    repoUrl: inv.args.repoUrl,
                    githubToken: inv.args.token || "",
                  },
                  result.workspaceId,
                );
              }
            }
          } catch (err: any) {
            if (err.name === "AbortError")
              throw new Error("Aborted by user.");
            completedInvocations[i].result = JSON.stringify({
              error: err.message,
            });
            completedInvocations[i].status = "error";
          }

          updateLog((prev) => {
            const copy = [...prev];
            const msgIdx = copy.findIndex((m) => m.id === asstMsg.id);
            if (msgIdx !== -1) {
              copy[msgIdx] = {
                ...copy[msgIdx],
                toolInvocations: [...completedInvocations],
              };
            }
            return copy;
          });
        }

        const toolResultMsg: ChatMessage = {
          id: Math.random().toString(36),
          role: "tool",
          content: "",
          toolInvocations: completedInvocations,
        };
        updateLog((prev) => [...prev, toolResultMsg]);
        iterMessages = [...iterMessages, toolResultMsg];
      } else {
        const finalMsg: ChatMessage = {
          id: Math.random().toString(36),
          role: "assistant",
          content: responseMsg.content,
          geminiParts: responseMsg.geminiParts,
          inputTokens,
          outputTokens,
          costUsd
        };
        updateLog((prev) => [...prev, finalMsg]);
        break;
      }
    }
  } catch (e: any) {
    updateLog((prev) => [
      ...prev,
      {
        id: Math.random().toString(36),
        role: "system",
        content: `Error: ${e.message}`,
      },
    ]);
  } finally {
    if (abortControllerRef.current === ac) abortControllerRef.current = null;
    setIsRunning(false);
  }
}
