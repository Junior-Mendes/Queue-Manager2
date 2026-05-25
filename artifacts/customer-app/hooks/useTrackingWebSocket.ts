import { useEffect, useRef, useState, useCallback } from "react";

export type WsStatus = "connecting" | "connected" | "disconnected" | "fallback";

interface UseQueueWebSocketOptions {
  enabled: boolean;
  onEntryUpdate: (data: unknown) => void;
  onQueueUpdate: () => void;
}

interface UseAppointmentWebSocketOptions {
  enabled: boolean;
  onMessage: (data: unknown) => void;
}

function getWsBaseUrl(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) {
    return `wss://${domain}`;
  }
  return "ws://localhost:8080";
}

export function useQueueWebSocket(
  queueId: string | null | undefined,
  entryId: string | null | undefined,
  options: UseQueueWebSocketOptions
): WsStatus {
  const { enabled, onEntryUpdate, onQueueUpdate } = options;
  const [status, setStatus] = useState<WsStatus>("connecting");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retriesRef = useRef(0);
  const onEntryUpdateRef = useRef(onEntryUpdate);
  const onQueueUpdateRef = useRef(onQueueUpdate);
  onEntryUpdateRef.current = onEntryUpdate;
  onQueueUpdateRef.current = onQueueUpdate;

  const connect = useCallback(() => {
    if (!enabled || !queueId || !entryId) return;

    const url = `${getWsBaseUrl()}/api/ws?type=queue&queueId=${encodeURIComponent(queueId)}&entryId=${encodeURIComponent(entryId)}`;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;
      setStatus("connecting");

      ws.onopen = () => {
        setStatus("connected");
        retriesRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data as string);
          if (parsed.event === "queue_entry_updated" && parsed.data) {
            onEntryUpdateRef.current(parsed.data);
          } else if (parsed.event === "queue_updated") {
            onQueueUpdateRef.current();
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        const maxRetries = 5;
        if (retriesRef.current < maxRetries) {
          setStatus("connecting");
          retriesRef.current += 1;
          const delay = Math.min(1000 * 2 ** retriesRef.current, 30000);
          reconnectTimerRef.current = setTimeout(connect, delay);
        } else {
          setStatus("fallback");
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      setStatus("fallback");
    }
  }, [enabled, queueId, entryId]);

  useEffect(() => {
    if (!enabled || !queueId || !entryId) {
      setStatus("disconnected");
      return;
    }

    connect();

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
      retriesRef.current = 0;
    };
  }, [connect, enabled, queueId, entryId]);

  return status;
}

export function useAppointmentWebSocket(
  appointmentId: string | null | undefined,
  options: UseAppointmentWebSocketOptions
): WsStatus {
  const { enabled, onMessage } = options;
  const [status, setStatus] = useState<WsStatus>("connecting");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retriesRef = useRef(0);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const connect = useCallback(() => {
    if (!enabled || !appointmentId) return;

    const url = `${getWsBaseUrl()}/api/ws?type=appointment&appointmentId=${encodeURIComponent(appointmentId)}`;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;
      setStatus("connecting");

      ws.onopen = () => {
        setStatus("connected");
        retriesRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data as string);
          if (parsed.event === "appointment_updated" && parsed.data) {
            onMessageRef.current(parsed.data);
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        const maxRetries = 5;
        if (retriesRef.current < maxRetries) {
          setStatus("connecting");
          retriesRef.current += 1;
          const delay = Math.min(1000 * 2 ** retriesRef.current, 30000);
          reconnectTimerRef.current = setTimeout(connect, delay);
        } else {
          setStatus("fallback");
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      setStatus("fallback");
    }
  }, [enabled, appointmentId]);

  useEffect(() => {
    if (!enabled || !appointmentId) {
      setStatus("disconnected");
      return;
    }

    connect();

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
      retriesRef.current = 0;
    };
  }, [connect, enabled, appointmentId]);

  return status;
}
