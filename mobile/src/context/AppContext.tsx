import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Alert, Case, MalnutritionCheck } from '../types';

type FollowUpTarget = 'case' | 'malnutrition';

type HydratedState = {
  cases: Case[];
  malnutritionChecks: MalnutritionCheck[];
  alerts: Alert[];
};

interface AppState {
  ready: boolean;
  cases: Case[];
  malnutritionChecks: MalnutritionCheck[];
  alerts: Alert[];
  addCase: (newCase: Omit<Case, 'id' | 'timestamp'>) => string;
  addMalnutritionCheck: (
    check: Omit<MalnutritionCheck, 'id' | 'timestamp'>,
  ) => string;
  setFollowUp: (id: string, type: FollowUpTarget, date: string) => void;
  toggleFollowUpCompleted: (id: string, type: FollowUpTarget) => void;
  clearHistory: () => void;
  refreshSessionData: () => Promise<void>;
}

const STORAGE_KEYS = {
  cases: 'santeai_cases',
  malnutrition: 'santeai_malnutrition',
  alerts: 'santeai_alerts',
} as const;

const AppContext = createContext<AppState | undefined>(undefined);

function safeJsonParse<T>(rawValue: string | null, fallback: T): T {
  if (!rawValue) return fallback;
  try {
    return JSON.parse(rawValue) as T;
  } catch {
    return fallback;
  }
}

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function buildAlertsFromCases(cases: Case[], existingAlerts: Alert[]): Alert[] {
  if (cases.length === 0) return existingAlerts;

  const now = Date.now();
  const recentCases = cases.filter((entry) => {
    const caseTime = new Date(entry.timestamp).getTime();
    return now - caseTime < 24 * 60 * 60 * 1000;
  });

  const categoryCounts: Record<string, number> = {};
  for (const entry of recentCases) {
    const normalized = entry.diseaseCategory.toLowerCase().trim();
    if (!normalized || normalized === 'inconnu') continue;
    categoryCounts[normalized] = (categoryCounts[normalized] || 0) + 1;
  }

  const nextAlerts = [...existingAlerts];

  for (const [disease, count] of Object.entries(categoryCounts)) {
    if (count < 3) continue;

    const existingIndex = nextAlerts.findIndex(
      (alertItem) => alertItem.disease.toLowerCase() === disease,
    );

    if (existingIndex >= 0) {
      if (nextAlerts[existingIndex].count !== count) {
        nextAlerts[existingIndex] = {
          ...nextAlerts[existingIndex],
          count,
          timestamp: new Date().toISOString(),
        };
      }
      continue;
    }

    nextAlerts.push({
      id: generateId(),
      disease,
      count,
      location: 'Zone couverte par la session actuelle',
      recommendations: `Alerte de niveau district. Veuillez informer le responsable de district immédiatement pour le foyer de ${disease}.`,
      timestamp: new Date().toISOString(),
    });
  }

  return nextAlerts;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [cases, setCases] = useState<Case[]>([]);
  const [malnutritionChecks, setMalnutritionChecks] = useState<MalnutritionCheck[]>(
    [],
  );
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const readStoredState = useCallback(async (): Promise<HydratedState> => {
    const values = await AsyncStorage.multiGet([
      STORAGE_KEYS.cases,
      STORAGE_KEYS.malnutrition,
      STORAGE_KEYS.alerts,
    ]);

    const map = Object.fromEntries(values);

    return {
      cases: safeJsonParse<Case[]>(map[STORAGE_KEYS.cases] ?? null, []),
      malnutritionChecks: safeJsonParse<MalnutritionCheck[]>(
        map[STORAGE_KEYS.malnutrition] ?? null,
        [],
      ),
      alerts: safeJsonParse<Alert[]>(map[STORAGE_KEYS.alerts] ?? null, []),
    };
  }, []);

  const applyHydratedState = useCallback((state: HydratedState) => {
    setCases(state.cases);
    setMalnutritionChecks(state.malnutritionChecks);
    setAlerts(state.alerts);
  }, []);

  const refreshSessionData = useCallback(async () => {
    const state = await readStoredState();
    applyHydratedState(state);
  }, [applyHydratedState, readStoredState]);

  useEffect(() => {
    let mounted = true;

    async function hydrate() {
      try {
        const state = await readStoredState();
        if (!mounted) return;
        applyHydratedState(state);
      } finally {
        if (mounted) {
          setReady(true);
        }
      }
    }

    hydrate();

    return () => {
      mounted = false;
    };
  }, [applyHydratedState, readStoredState]);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(STORAGE_KEYS.cases, JSON.stringify(cases)).catch(() => {
      // no-op
    });
  }, [cases, ready]);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(
      STORAGE_KEYS.malnutrition,
      JSON.stringify(malnutritionChecks),
    ).catch(() => {
      // no-op
    });
  }, [malnutritionChecks, ready]);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(STORAGE_KEYS.alerts, JSON.stringify(alerts)).catch(() => {
      // no-op
    });
  }, [alerts, ready]);

  useEffect(() => {
    if (!ready) return;
    const nextAlerts = buildAlertsFromCases(cases, alerts);
    if (JSON.stringify(nextAlerts) !== JSON.stringify(alerts)) {
      setAlerts(nextAlerts);
    }
  }, [cases, alerts, ready]);

  const value = useMemo<AppState>(
    () => ({
      ready,
      cases,
      malnutritionChecks,
      alerts,
      addCase: (newCase) => {
        const fullCase: Case = {
          ...newCase,
          id: generateId(),
          timestamp: new Date().toISOString(),
        };
        setCases((prev) => [fullCase, ...prev]);
        return fullCase.id;
      },
      addMalnutritionCheck: (check) => {
        const fullCheck: MalnutritionCheck = {
          ...check,
          id: generateId(),
          timestamp: new Date().toISOString(),
        };
        setMalnutritionChecks((prev) => [fullCheck, ...prev]);
        return fullCheck.id;
      },
      setFollowUp: (id, type, date) => {
        if (type === 'case') {
          setCases((prev) =>
            prev.map((entry) =>
              entry.id === id
                ? { ...entry, followUpDate: date, followUpCompleted: false }
                : entry,
            ),
          );
          return;
        }

        setMalnutritionChecks((prev) =>
          prev.map((entry) =>
            entry.id === id
              ? { ...entry, followUpDate: date, followUpCompleted: false }
              : entry,
          ),
        );
      },
      toggleFollowUpCompleted: (id, type) => {
        if (type === 'case') {
          setCases((prev) =>
            prev.map((entry) =>
              entry.id === id
                ? {
                    ...entry,
                    followUpCompleted: !entry.followUpCompleted,
                  }
                : entry,
            ),
          );
          return;
        }

        setMalnutritionChecks((prev) =>
          prev.map((entry) =>
            entry.id === id
              ? {
                  ...entry,
                  followUpCompleted: !entry.followUpCompleted,
                }
              : entry,
          ),
        );
      },
      clearHistory: () => {
        setCases([]);
        setMalnutritionChecks([]);
        setAlerts([]);
        AsyncStorage.multiRemove([
          STORAGE_KEYS.cases,
          STORAGE_KEYS.malnutrition,
          STORAGE_KEYS.alerts,
        ]).catch(() => {
          // no-op
        });
      },
      refreshSessionData,
    }),
    [alerts, cases, malnutritionChecks, ready, refreshSessionData],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}
