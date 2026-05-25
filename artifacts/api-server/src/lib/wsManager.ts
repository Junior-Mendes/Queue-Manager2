import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import type { Server } from "http";
import { logger } from "./logger";

interface QueueSubscription {
  type: "queue";
  queueId: string;
  entryId: string;
}

interface AppointmentSubscription {
  type: "appointment";
  appointmentId: string;
}

type Subscription = QueueSubscription | AppointmentSubscription;

interface TrackedClient {
  ws: WebSocket;
  subscription: Subscription;
}

let wss: WebSocketServer | null = null;
const clients = new Set<TrackedClient>();

export function initWebSocketServer(server: Server): void {
  wss = new WebSocketServer({ server, path: "/api/ws" });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url ?? "", "http://localhost");
    const type = url.searchParams.get("type");

    let subscription: Subscription | null = null;

    if (type === "queue") {
      const queueId = url.searchParams.get("queueId");
      const entryId = url.searchParams.get("entryId");
      if (queueId && entryId) {
        subscription = { type: "queue", queueId, entryId };
      }
    } else if (type === "appointment") {
      const appointmentId = url.searchParams.get("appointmentId");
      if (appointmentId) {
        subscription = { type: "appointment", appointmentId };
      }
    }

    if (!subscription) {
      ws.close(1008, "Missing or invalid subscription parameters");
      return;
    }

    const client: TrackedClient = { ws, subscription };
    clients.add(client);

    logger.info({ type: subscription.type }, "WebSocket client connected");

    ws.on("close", () => {
      clients.delete(client);
      logger.info({ type: subscription!.type }, "WebSocket client disconnected");
    });

    ws.on("error", (err) => {
      logger.warn({ err }, "WebSocket client error");
      clients.delete(client);
    });

    ws.send(JSON.stringify({ event: "connected" }));
  });

  logger.info("WebSocket server initialized at /api/ws");
}

export function broadcastQueueEntryUpdate(queueId: string, entryId: string, data: unknown): void {
  for (const client of clients) {
    if (
      client.subscription.type === "queue" &&
      client.subscription.queueId === queueId &&
      client.subscription.entryId === entryId &&
      client.ws.readyState === WebSocket.OPEN
    ) {
      client.ws.send(JSON.stringify({ event: "queue_entry_updated", data }));
    }
  }
}

export function broadcastQueueUpdate(queueId: string, data: unknown): void {
  for (const client of clients) {
    if (
      client.subscription.type === "queue" &&
      client.subscription.queueId === queueId &&
      client.ws.readyState === WebSocket.OPEN
    ) {
      client.ws.send(JSON.stringify({ event: "queue_updated", data }));
    }
  }
}

export function broadcastAppointmentUpdate(appointmentId: string, data: unknown): void {
  for (const client of clients) {
    if (
      client.subscription.type === "appointment" &&
      client.subscription.appointmentId === appointmentId &&
      client.ws.readyState === WebSocket.OPEN
    ) {
      client.ws.send(JSON.stringify({ event: "appointment_updated", data }));
    }
  }
}
