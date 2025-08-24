import { useState, useEffect, useCallback } from 'react';
import { openCodeService, handleOpencodeError } from '@/lib/opencode';

interface ApiResponse<T> {
  data?: T;
  error?: unknown;
  request?: Request;
  response?: Response;
}

interface SessionData {
  id: string;
  title?: string;
}

interface MessageData {
  content?: string;
  data?: {
    content?: string;
  };
}

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Session {
  id: string;
  title?: string;
  createdAt?: Date;
}

export function useOpenCode() {
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const createSession = useCallback(async (title?: string) => {
    try {
      setLoading(true);
      const session = await openCodeService.createSession() as ApiResponse<SessionData>;
      const newSession: Session = {
        id: session.data?.id || `session-${Date.now()}`,
        title: title || session.data?.title,
        createdAt: new Date(),
      };
      setCurrentSession(newSession);
      setMessages([]);
      return newSession;
    } catch (error) {
      console.error('Failed to create session:', error);
      throw new Error(handleOpencodeError(error));
    } finally {
      setLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!currentSession) {
      throw new Error('No active session');
    }

    try {
      setLoading(true);

      // Add user message to local state
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        type: 'user',
        content,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);

      // Send message to OpenCode
      const response = await openCodeService.sendMessage(currentSession.id, content) as ApiResponse<MessageData>;

      // Add assistant response to local state
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        type: 'assistant',
        content: response.data?.content || 'No response content',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);

      return assistantMessage;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw new Error(handleOpencodeError(error));
    } finally {
      setLoading(false);
    }
  }, [currentSession]);

  const loadMessages = useCallback(async (sessionId: string) => {
    try {
      const response = await openCodeService.getMessages(sessionId) as ApiResponse<Record<string, unknown>[]>;
      const messagesArray = Array.isArray(response) ? response : response.data || [];
      const loadedMessages: Message[] = messagesArray.map((msg: Record<string, unknown>, index: number) => ({
        id: (msg.id as string) || ((msg.info as Record<string, unknown>)?.id as string) || `msg-${index}`,
        type: ((msg.type as string) || ((msg.info as Record<string, unknown>)?.type as string)) === 'user' ? 'user' : 'assistant',
        content: (msg.content as string) || ((msg.info as Record<string, unknown>)?.content as string) || '',
        timestamp: new Date((msg.timestamp as string | number) || ((msg.info as Record<string, unknown>)?.timestamp as string | number) || Date.now()),
      }));
      setMessages(loadedMessages);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }, []);

  // Load messages when session changes
  useEffect(() => {
    if (currentSession) {
      loadMessages(currentSession.id);
    }
  }, [currentSession, loadMessages]);

  return {
    currentSession,
    messages,
    loading,
    createSession,
    sendMessage,
  };
}