import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Case, MalnutritionCheck, Alert } from '../types';

interface AppState {
  cases: Case[];
  malnutritionChecks: MalnutritionCheck[];
  alerts: Alert[];
  addCase: (newCase: Omit<Case, 'id' | 'timestamp'>) => string;
  addMalnutritionCheck: (check: Omit<MalnutritionCheck, 'id' | 'timestamp'>) => string;
  setFollowUp: (id: string, type: 'case' | 'malnutrition', date: string) => void;
  toggleFollowUpCompleted: (id: string, type: 'case' | 'malnutrition') => void;
  clearHistory: () => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [cases, setCases] = useState<Case[]>(() => {
    try {
      const saved = localStorage.getItem('santeai_cases');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [malnutritionChecks, setMalnutritionChecks] = useState<MalnutritionCheck[]>(() => {
    try {
      const saved = localStorage.getItem('santeai_malnutrition');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [alerts, setAlerts] = useState<Alert[]>(() => {
    try {
      const saved = localStorage.getItem('santeai_alerts');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('santeai_cases', JSON.stringify(cases));
  }, [cases]);

  useEffect(() => {
    localStorage.setItem('santeai_malnutrition', JSON.stringify(malnutritionChecks));
  }, [malnutritionChecks]);

  useEffect(() => {
    localStorage.setItem('santeai_alerts', JSON.stringify(alerts));
  }, [alerts]);

  // Epidemic Alert logic: Check if 3+ cases of the same category exist within the last 24h
  useEffect(() => {
    if (cases.length === 0) return;

    const recentCases = cases.filter(c => {
      const caseTime = new Date(c.timestamp).getTime();
      const now = new Date().getTime();
      return (now - caseTime) < 24 * 60 * 60 * 1000;
    });

    const categoryCounts: Record<string, number> = {};
    recentCases.forEach(c => {
      // Normalize category (case insensitive, trimmed)
      const cat = c.diseaseCategory.toLowerCase().trim();
      if (!cat || cat === 'inconnu') return;
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    const newAlerts: Alert[] = [...alerts];

    Object.entries(categoryCounts).forEach(([disease, count]) => {
      if (count >= 3) {
        // Check if an alert for this disease already exists (to update or create)
        const existingAlertIdx = newAlerts.findIndex(a => a.disease.toLowerCase() === disease);
        
        if (existingAlertIdx >= 0) {
          // Only update if count has changed
          if (newAlerts[existingAlertIdx].count !== count) {
            newAlerts[existingAlertIdx] = {
              ...newAlerts[existingAlertIdx],
              count,
              timestamp: new Date().toISOString()
            };
          }
        } else {
          // Create new alert
          newAlerts.push({
            id: Math.random().toString(36).substring(7),
            disease,
            count,
            location: 'Zone couverte par la session actuelle',
            recommendations: `Alerte de niveau district. Veuillez informer le responsable de district immédiatement pour le foyer de ${disease}.`,
            timestamp: new Date().toISOString()
          });
        }
      }
    });

    if (JSON.stringify(newAlerts) !== JSON.stringify(alerts)) {
      setAlerts(newAlerts);
    }
  }, [cases]);

  const addCase = (newCase: Omit<Case, 'id' | 'timestamp'>) => {
    const fullCase: Case = {
      ...newCase,
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString()
    };
    setCases(prev => [fullCase, ...prev]);
    return fullCase.id;
  };

  const addMalnutritionCheck = (check: Omit<MalnutritionCheck, 'id' | 'timestamp'>) => {
    const fullCheck: MalnutritionCheck = {
      ...check,
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString()
    };
    setMalnutritionChecks(prev => [fullCheck, ...prev]);
    return fullCheck.id;
  };

  const setFollowUp = (id: string, type: 'case' | 'malnutrition', date: string) => {
    if (type === 'case') {
      setCases(prev => prev.map(c => c.id === id ? { ...c, followUpDate: date, followUpCompleted: false } : c));
    } else {
      setMalnutritionChecks(prev => prev.map(c => c.id === id ? { ...c, followUpDate: date, followUpCompleted: false } : c));
    }
  };

  const toggleFollowUpCompleted = (id: string, type: 'case' | 'malnutrition') => {
    if (type === 'case') {
      setCases(prev => prev.map(c => c.id === id ? { ...c, followUpCompleted: !c.followUpCompleted } : c));
    } else {
      setMalnutritionChecks(prev => prev.map(c => c.id === id ? { ...c, followUpCompleted: !c.followUpCompleted } : c));
    }
  };

  const clearHistory = () => {
    setCases([]);
    setMalnutritionChecks([]);
    setAlerts([]);
    localStorage.removeItem('santeai_cases');
    localStorage.removeItem('santeai_malnutrition');
    localStorage.removeItem('santeai_alerts');
  };

  return (
    <AppContext.Provider value={{
      cases,
      malnutritionChecks,
      alerts,
      addCase,
      addMalnutritionCheck,
      setFollowUp,
      toggleFollowUpCompleted,
      clearHistory
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
}
