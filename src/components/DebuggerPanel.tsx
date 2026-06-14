import { useState, useEffect, useRef } from "react";
import { Play, Square, Loader2, RefreshCw, Terminal, CheckCircle2, XCircle, BrainCircuit } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface DebugSession {
  id: string;
  command: string;
  status: "running" | "exited" | "failed";
  exitCode?: number;
  pid?: number;
}

interface DebuggerPanelProps {
  workspaceId: string;
}

export function DebuggerPanel({ workspaceId }: DebuggerPanelProps) {
  const [sessions, setSessions] = useState<DebugSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [command, setCommand] = useState<string>("node index.js");
  const [logs, setLogs] = useState<string>("");
  const [running, setRunning] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  
  // AI Debugging States
  const [aiAnalyzing, setAiAnalyzing] = useState<boolean>(false);
  const [aiSuggestions, setAiSuggestions] = useState<string>("");

  const logEndRef = useRef<HTMLDivElement>(null);

  const fetchSessions = async () => {
    try {
      const res = await fetch("/api/debug/sessions");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
        if (data.sessions.length > 0 && !activeSessionId) {
          // Auto select the first active or latest session
          setActiveSessionId(data.sessions[data.sessions.length - 1].id);
        }
      }
    } catch (e) {
      console.error("Failed to load debug sessions", e);
    }
  };

  const getLogs = async (id: string) => {
    if (!id) return;
    try {
      const res = await fetch("/api/debug/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: id }),
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || "");
        
        // Update session status in local state
        setSessions((prev) =>
          prev.map((s) =>
            s.id === id ? { ...s, status: data.status, exitCode: data.exitCode } : s
          )
        );

        if (id === activeSessionId) {
          setRunning(data.status === "running");
        }
      }
    } catch (e) {
      console.error("Failed to fetch logs", e);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  // Poll logs if the active session is running
  useEffect(() => {
    if (!activeSessionId) return;
    
    // Initial fetch
    getLogs(activeSessionId);
    
    const activeSession = sessions.find(s => s.id === activeSessionId);
    if (activeSession && activeSession.status !== "running") {
      setRunning(false);
      return;
    }

    const interval = setInterval(() => {
      getLogs(activeSessionId);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSessionId, running]);

  // Scroll to bottom when logs change
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleStart = async () => {
    if (!command.trim()) return;
    setLoading(true);
    setAiSuggestions("");
    try {
      const res = await fetch("/api/debug/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, command }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setActiveSessionId(data.sessionId);
          setRunning(true);
          await fetchSessions();
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleKill = async () => {
    if (!activeSessionId) return;
    try {
      const res = await fetch("/api/debug/kill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: activeSessionId }),
      });
      if (res.ok) {
        setRunning(false);
        getLogs(activeSessionId);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // AI Debugging Logic
  const handleAiDebug = async () => {
    if (!logs) return;
    setAiAnalyzing(true);
    setAiSuggestions("");
    try {
      const systemPrompt = "You are an expert debugger and senior software developer. You will diagnose stack traces, script crashes, and syntax errors, and supply highly accurate code fixes.";
      const prompt = `Below is the command executed and its console output/logs which contains an error or crash.
Command: ${command}

Logs:
${logs}

Analyze the error. Explain:
1. What went wrong (root cause).
2. How to fix it.
3. Provide the exact corrected code block(s) with clear markdown styling. Make it clear and directly applicable.`;

      const settingsString = localStorage.getItem("agent_settings");
      const settings = settingsString ? JSON.parse(settingsString) : {};
      const geminiModel = settings.geminiModel || "gemini-2.5-flash";
      const clientApiKey = settings.geminiApiKey || "";

      const payload = {
        systemInstruction: {
          role: "user",
          parts: [{ text: systemPrompt }]
        },
        contents: [{
          role: "user",
          parts: [{ text: prompt }]
        }]
      };

      const res = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: geminiModel,
          payload,
          clientApiKey
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to consult Gemini API");
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "No diagnostics generated.";
      setAiSuggestions(text);
    } catch (e: any) {
      setAiSuggestions(`Error calling Gemini for debug: ${e.message}. Make sure your Gemini API Key is entered in settings.`);
    } finally {
      setAiAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0e0e11] text-slate-300">
      {/* Top control bar */}
      <div className="p-4 border-b border-white/5 bg-[#141419] flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-500" />
          <span className="text-xs font-semibold text-white uppercase tracking-wider">
            Interactive Script Debugger
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            disabled={running}
            placeholder="e.g. node index.js, python script.py"
            className="bg-[#18181f] text-xs text-white border border-white/10 rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-500 w-64 font-mono"
          />
          {running ? (
            <button
              onClick={handleKill}
              className="px-3.5 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Square className="w-3.5 h-3.5 fill-current" /> Stop
            </button>
          ) : (
            <button
              onClick={handleStart}
              disabled={loading || !command.trim()}
              className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-40"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              Run Debug
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sessions Sidebar */}
        <div className="w-48 border-r border-white/5 bg-[#0b0b0e] flex flex-col shrink-0">
          <div className="p-3 border-b border-white/5 text-[10px] uppercase font-bold text-slate-500 tracking-wider flex justify-between items-center">
            <span>Sessions</span>
            <button onClick={fetchSessions} className="hover:text-white transition-colors p-0.5">
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sessions.length === 0 ? (
              <div className="text-center py-6 text-slate-600 text-xs font-mono">
                No active runs
              </div>
            ) : (
              sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setActiveSessionId(s.id);
                    getLogs(s.id);
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-mono flex items-center justify-between border transition-all ${
                    s.id === activeSessionId
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 font-medium"
                      : "bg-transparent border-transparent text-slate-400 hover:bg-white/5"
                  }`}
                >
                  <span className="truncate max-w-[100px]">{s.command}</span>
                  {s.status === "running" && (
                    <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                  )}
                  {s.status === "exited" && (
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  )}
                  {s.status === "failed" && (
                    <XCircle className="w-3 h-3 text-rose-500" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Main Debugger Output */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Output Terminal window */}
          <div className="flex-1 flex flex-col overflow-hidden bg-[#09090b]">
            <div className="p-2.5 border-b border-white/5 bg-[#0b0b0e] flex justify-between items-center text-xs">
              <span className="text-slate-400 font-mono">Terminal Outputs</span>
              {logs && (
                <button
                  onClick={handleAiDebug}
                  disabled={aiAnalyzing}
                  className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-md flex items-center gap-1.5 transition-all text-[11px]"
                >
                  {aiAnalyzing ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <BrainCircuit className="w-3.5 h-3.5" />
                  )}
                  Debug with AI
                </button>
              )}
            </div>
            <div className="flex-1 p-4 font-mono text-[12px] leading-relaxed overflow-y-auto whitespace-pre-wrap select-text selection:bg-emerald-500/30">
              {logs ? (
                logs
              ) : (
                <span className="text-slate-600 italic">No output logs yet. Select or start a debug session.</span>
              )}
              <div ref={logEndRef} />
            </div>
          </div>

          {/* AI Debug Suggestions Panel */}
          {(aiSuggestions || aiAnalyzing) && (
            <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-white/5 bg-[#0e0e11] flex flex-col overflow-hidden shrink-0">
              <div className="p-3 border-b border-white/5 bg-[#141419] flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                <BrainCircuit className="w-4 h-4" />
                <span>AI Agent Diagnosis</span>
              </div>
              <div className="flex-1 p-4 overflow-y-auto text-xs leading-relaxed markdown-body select-text">
                {aiAnalyzing ? (
                  <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-500 font-mono">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                    <span>Analyzing logs & stack trace...</span>
                  </div>
                ) : (
                  <div className="prose prose-invert prose-xs max-w-none">
                    <ReactMarkdown>{aiSuggestions}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
