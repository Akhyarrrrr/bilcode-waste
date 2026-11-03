import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import * as SecureStore from "expo-secure-store";
import { message } from "./lib/api";
import { finishOnboarding, loadOnboarding } from "./onboarding";
import { useSession } from "./session";

interface OnboardingState {
  loading: boolean;
  completed: boolean;
  error: string | null;
  reload: () => Promise<void>;
  finish: () => Promise<void>;
}
const Context = createContext<OnboardingState | null>(null);
export function OnboardingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useSession();
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCompleted(await loadOnboarding(SecureStore.getItemAsync));
    } catch (error) {
      setError(message(error));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void reload();
  }, [reload]);
  const finish = useCallback(async () => {
    const saved = await finishOnboarding(SecureStore.setItemAsync);
    setCompleted(saved);
    setError(null);
  }, []);
  useEffect(() => {
    if (user && !loading && !completed)
      void finish().catch((error) => setError(message(error)));
  }, [user, loading, completed, finish]);
  return (
    <Context.Provider value={{ loading, completed, error, reload, finish }}>
      {children}
    </Context.Provider>
  );
}
export function useOnboarding() {
  const value = useContext(Context);
  if (!value) throw new Error("OnboardingProvider diperlukan.");
  return value;
}
