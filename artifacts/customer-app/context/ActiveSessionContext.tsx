import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type SessionType = "queue" | "appointment";

interface ActiveSession {
  type: SessionType;
  id: string;
  queueId?: string;
  businessSlug?: string;
  businessName?: string;
}

interface ActiveSessionContextValue {
  session: ActiveSession | null;
  setSession: (session: ActiveSession | null) => void;
  clearSession: () => void;
  isLoading: boolean;
}

const ActiveSessionContext = createContext<ActiveSessionContextValue>({
  session: null,
  setSession: () => {},
  clearSession: () => {},
  isLoading: true,
});

const STORAGE_KEY = "@customer_app:active_session";

export function ActiveSessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<ActiveSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          setSessionState(JSON.parse(raw));
        } catch { /* ignore */ }
      }
      setIsLoading(false);
    });
  }, []);

  const setSession = useCallback(async (s: ActiveSession | null) => {
    setSessionState(s);
    if (s) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const clearSession = useCallback(async () => {
    setSessionState(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <ActiveSessionContext.Provider value={{ session, setSession, clearSession, isLoading }}>
      {children}
    </ActiveSessionContext.Provider>
  );
}

export function useActiveSession() {
  return useContext(ActiveSessionContext);
}
