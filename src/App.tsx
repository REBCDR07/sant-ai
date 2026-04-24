import React, { useState, useEffect } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import Triage from './components/Triage';
import Malnutrition from './components/Malnutrition';
import History from './components/History';
import AlertsDashboard from './components/AlertsDashboard';
import ChatBot from './components/ChatBot';
import { Activity, Camera, ClipboardList, Siren } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function AppContent() {
  const [activeTab, setActiveTab] = useState<'triage' | 'malnutrition' | 'history' | 'alerts'>('triage');
  const { alerts } = useAppContext();

  useEffect(() => {
    if ('Notification' in window) {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    }
  }, []);

  const NavButtons = ({ isMobile = false }) => (
    <>
      <button 
        onClick={() => setActiveTab('triage')}
        className={`flex ${isMobile ? 'flex-col justify-center' : 'flex-row justify-start px-8'} items-center w-full h-full md:h-16 space-y-1 md:space-y-0 md:space-x-4 ${activeTab === 'triage' ? 'text-slate-900 md:bg-slate-50 border-r-2 border-transparent md:border-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
      >
        <Activity className="w-5 h-5 mb-0.5 md:mb-0" strokeWidth={activeTab === 'triage' ? 2.5 : 2} />
        <span className="text-[9px] md:text-[11px] font-bold uppercase tracking-widest">Triage</span>
      </button>
      
      <button 
        onClick={() => setActiveTab('malnutrition')}
        className={`flex ${isMobile ? 'flex-col justify-center' : 'flex-row justify-start px-8'} items-center w-full h-full md:h-16 space-y-1 md:space-y-0 md:space-x-4 ${activeTab === 'malnutrition' ? 'text-slate-900 md:bg-slate-50 border-r-2 border-transparent md:border-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
      >
        <Camera className="w-5 h-5 mb-0.5 md:mb-0" strokeWidth={activeTab === 'malnutrition' ? 2.5 : 2} />
        <span className="text-[9px] md:text-[11px] font-bold uppercase tracking-widest">Visuel</span>
      </button>
      
      <button 
        onClick={() => setActiveTab('history')}
        className={`flex ${isMobile ? 'flex-col justify-center' : 'flex-row justify-start px-8'} items-center w-full h-full md:h-16 space-y-1 md:space-y-0 md:space-x-4 ${activeTab === 'history' ? 'text-slate-900 md:bg-slate-50 border-r-2 border-transparent md:border-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
      >
        <ClipboardList className="w-5 h-5 mb-0.5 md:mb-0" strokeWidth={activeTab === 'history' ? 2.5 : 2} />
        <span className="text-[9px] md:text-[11px] font-bold uppercase tracking-widest">Registre</span>
      </button>
      
      <button 
        onClick={() => setActiveTab('alerts')}
        className={`flex ${isMobile ? 'flex-col justify-center' : 'flex-row justify-start px-8'} items-center w-full h-full md:h-16 space-y-1 md:space-y-0 md:space-x-4 relative ${activeTab === 'alerts' ? 'text-slate-900 md:bg-slate-50 border-r-2 border-transparent md:border-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
      >
        <div className="relative mb-0.5 md:mb-0">
          <Siren className="w-5 h-5" strokeWidth={activeTab === 'alerts' ? 2.5 : 2} />
          {alerts.length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 border-2 border-white"></span>
            </span>
          )}
        </div>
        <span className="text-[9px] md:text-[11px] font-bold uppercase tracking-widest">Alertes</span>
      </button>
    </>
  );

  return (
    <div className="flex h-[100dvh] bg-slate-100 overflow-hidden font-sans">
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-72 bg-white border-r border-slate-200 z-20 shrink-0">
        <div className="p-8 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-inner">S+</div>
            <h1 className="text-2xl font-black tracking-tighter uppercase italic text-slate-900">SantéAI</h1>
          </div>
          <div className="mt-6 flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 rounded border border-emerald-100/50 w-max">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] font-bold uppercase tracking-widest">Système Actif</span>
          </div>
        </div>
        <nav className="flex-1 py-6 flex flex-col gap-2">
          <NavButtons isMobile={false} />
        </nav>
      </aside>

      <div className="flex flex-col flex-1 min-w-0 relative">
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center z-10 shrink-0 shadow-sm relative">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">S+</div>
            <h1 className="text-xl font-black tracking-tighter uppercase italic text-slate-900">SantéAI</h1>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[9px] font-bold uppercase tracking-widest">Actif</span>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto w-full max-w-lg md:max-w-5xl mx-auto pb-[80px] md:pb-0 px-0 md:px-8 md:py-8">
          <div className="bg-white md:shadow-sm md:rounded-2xl md:border md:border-slate-200 overflow-hidden min-h-full">
            <AnimatePresence mode="wait">
              {activeTab === 'triage' && (
                <motion.div key="triage" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                  <Triage />
                </motion.div>
              )}
              {activeTab === 'malnutrition' && (
                <motion.div key="malnutrition" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                  <Malnutrition />
                </motion.div>
              )}
              {activeTab === 'history' && (
                <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                  <History />
                </motion.div>
              )}
              {activeTab === 'alerts' && (
                <motion.div key="alerts" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                  <AlertsDashboard />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden bg-white border-t border-slate-200 absolute bottom-0 w-full z-20 h-[72px] shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          <div className="flex justify-around items-center h-full px-2 max-w-lg mx-auto">
            <NavButtons isMobile={true} />
          </div>
        </nav>
      </div>

      {/* Persistent Floating ChatBot */}
      <ChatBot />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
