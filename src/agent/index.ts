import { useState, useCallback, useRef } from "react";
import { Settings } from "../types";
import { fetchOllamaModels } from "../ollama";
import { useAgentSessions } from "./useAgentSessions";
import { runAgentLoop } from "./runAgentLoop";

export function useAgent(
  settings: Settings,
  workspaceId: string,
  onSettingsUpdate?: (s: Partial<Settings>, newWorkspaceId?: string) => void,
) {
  const {
    sessions,
    setSessions,
    sessionsRef,
    currentSessionId,
    messages,
    createSessionUpdater,
    setMessagesForCurrent,
    clearMessages,
    startNewChat,
    switchSession,
    deleteSession,
  } = useAgentSessions();

  const [isRunning, setIsRunning] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [modelsError, setModelsError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const abortAgent = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsRunning(false);
  };

  const loadModels = useCallback(async () => {
    if (!settings.ollamaUrl) return;
    setModelsError(null);
    const { models: m, error } = await fetchOllamaModels(settings.ollamaUrl);
    setModels(m);
    if (error) setModelsError(error);
  }, [settings.ollamaUrl]);

  const sendMessage = async (text: string) => {
    const userMsg = {
      id: Math.random().toString(36),
      role: "user" as const,
      content: text,
    };

    const activeId = currentSessionId;
    const boundedUpdater = createSessionUpdater(activeId);

    boundedUpdater((prev) => {
      const updated = [...prev, userMsg];
      setTimeout(() => runAgentLoop({
        currentMessages: updated,
        updateLog: boundedUpdater,
        settings,
        workspaceId,
        sessionsRef,
        currentSessionId: activeId,
        setSessions,
        abortControllerRef,
        onSettingsUpdate,
        setIsRunning,
      }), 0);
      return updated;
    });
  };

  return {
    messages,
    sendMessage,
    isRunning,
    clearMessages,
    models,
    modelsError,
    loadModels,
    sessions,
    currentSessionId,
    startNewChat,
    switchSession,
    deleteSession,
    abortAgent,
  };
}
