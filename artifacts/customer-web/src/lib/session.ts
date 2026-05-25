const SESSION_KEY = "customer_web_session";

export interface QueueSession {
  type: "queue";
  id: string;
  queueId: string;
  businessSlug: string;
  businessName: string;
}

export interface AppointmentSession {
  type: "appointment";
  id: string;
  businessSlug: string;
  businessName: string;
}

export type CustomerSession = QueueSession | AppointmentSession;

export function loadSession(): CustomerSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CustomerSession;
  } catch {
    return null;
  }
}

export function saveSession(session: CustomerSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}
