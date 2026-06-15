import { useState, useCallback, useEffect, useRef } from "react";
import { ChatMessage, ChatSession } from "../types";

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
    if (sessions.length > 0) {
      localStorage.setItem("agent_sessions", JSON.stringify(sessions));
    } else {
      localStorage.removeItem("agent_sessions");
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
