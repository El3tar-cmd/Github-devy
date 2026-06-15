import { useState, useCallback, useEffect, useRef } from "react";
import { ChatMessage, ChatSession } from "../types";

const MAX_STORED_SESSIONS = 20;
const MAX_TOOL_RESULT_CHARS = 20000;

function sanitizeToolResult(result?: string) {
  if (!result) return result;

  try {
    const parsed = JSON.parse(result);
    if (typeof parsed?.screenshot === "string" && parsed.screenshot.startsWith("data:image/")) {
      return JSON.stringify({
        ...parsed,
        screenshot: undefined,
        screenshotOmitted: true,
      });
    }
  } catch (e) {}

  if (result.length > MAX_TOOL_RESULT_CHARS) {
    return `${result.slice(0, MAX_TOOL_RESULT_CHARS)}\n...[truncated for local storage]`;
  }

  return result;
}

function sanitizeSessionsForStorage(sessions: ChatSession[]) {
  return sessions.slice(0, MAX_STORED_SESSIONS).map((session) => ({
    ...session,
    messages: session.messages.map((message) => ({
      ...message,
      toolInvocations: message.toolInvocations?.map((invocation) => ({
        ...invocation,
        result: sanitizeToolResult(invocation.result),
      })),
    })),
  }));
}

export function useAgentSessions() {
  // Session Persistence
  const getInitialSessions = () => {
    if (typeof window === "undefined") return [];
    const saved = localStorage.getItem("agent_sessions");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [];
  };

  const [sessions, setSessions] = useState<ChatSession[]>(getInitialSessions);

  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("current_session_id");
      if (saved) return saved;
    }
    return Math.random().toString(36).substring(7);
  });

  useEffect(() => {
    try {
      if (sessions.length > 0) {
        localStorage.setItem("agent_sessions", JSON.stringify(sanitizeSessionsForStorage(sessions)));
      } else {
        localStorage.removeItem("agent_sessions");
      }
    } catch (err: any) {
      if (err?.name === "QuotaExceededError") {
        try {
          localStorage.setItem("agent_sessions", JSON.stringify(sanitizeSessionsForStorage(sessions.slice(0, 5))));
        } catch (fallbackErr) {
          console.warn("Failed to persist agent sessions after trimming.", fallbackErr);
        }
      } else {
        console.warn("Failed to persist agent sessions.", err);
      }
    }
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem("current_session_id", currentSessionId);
  }, [currentSessionId]);

  // Keep a ref to sessions for async closures (avoids stale closure bug)
  const sessionsRef = useRef<ChatSession[]>(sessions);
  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  const currentSession = sessions.find((s) => s.id === currentSessionId) || {
    id: currentSessionId,
    title: "New Chat",
    messages: [],
    updatedAt: Date.now(),
  };
  const messages = currentSession.messages;

  // Safe Session Updater to avoid async closures referencing old IDs point to the wrong session
  const createSessionUpdater = useCallback((targetId: string) => {
    return (updater: ChatMessage[] | ((p: ChatMessage[]) => ChatMessage[])) => {
      setSessions((prev: ChatSession[]) => {
        const current = prev.find((s: ChatSession) => s.id === targetId) || {
          id: targetId,
          title: "New Chat",
          messages: [],
          updatedAt: Date.now(),
        };
        const newMessages =
          typeof updater === "function" ? updater(current.messages) : updater;

        let title = current.title;
        if (newMessages.length > 0 && (title === "New Chat" || title === "")) {
          const firstUser = newMessages.find((m) => m.role === "user");
          if (firstUser && firstUser.content) {
            title =
              firstUser.content.substring(0, 30) +
              (firstUser.content.length > 30 ? "..." : "");
          }
        }

        const updatedSession = {
          ...current,
          messages: newMessages,
          title: newMessages.length === 0 ? "New Chat" : title,
          updatedAt: Date.now(),
          ...(newMessages.length === 0 ? { historySummary: "", summarizedCount: 0 } : {})
        };
        const filtered = prev.filter((s) => s.id !== targetId);
        return [updatedSession, ...filtered].sort(
          (a, b) => b.updatedAt - a.updatedAt,
        );
      });
    };
  }, []);

  const setMessagesForCurrent = useCallback(
    (updater: ChatMessage[] | ((p: ChatMessage[]) => ChatMessage[])) => {
      createSessionUpdater(currentSessionId)(updater);
    },
    [currentSessionId, createSessionUpdater],
  );

  const clearMessages = () => setMessagesForCurrent([]);

  const startNewChat = () => {
    setCurrentSessionId(Math.random().toString(36).substring(7));
  };

  const switchSession = (id: string) => {
    setCurrentSessionId(id);
  };

  const deleteSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (currentSessionId === id) {
      setCurrentSessionId(Math.random().toString(36).substring(7));
    }
  };

  return {
    sessions,
    setSessions,
    sessionsRef,
    currentSessionId,
    currentSession,
    messages,
    createSessionUpdater,
    setMessagesForCurrent,
    clearMessages,
    startNewChat,
    switchSession,
    deleteSession,
  };
}
