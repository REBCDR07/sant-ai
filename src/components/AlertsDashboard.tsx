import React from 'react';
import { useAppContext } from '../context/AppContext';
import { Siren } from 'lucide-react';

export default function AlertsDashboard() {
  const { alerts } = useAppContext();

  if (alerts.length === 0) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-[70vh] text-center bg-slate-50">
        <div className="bg-emerald-100 p-6 rounded-full mb-4">
          <Siren className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-serif italic text-slate-900">Aucune alerte</h2>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-2">Situation sanitaire stable.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 bg-slate-50 min-h-full">
      <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-6">Alertes District de Santé</h2>
      
      <div className="space-y-4">
        {alerts.map(alert => (
          <div key={alert.id} className="bg-white border-l-4 border-rose-600 p-5 shadow-sm">
            <p className="text-xs font-bold text-rose-600 uppercase tracking-widest mb-1">Epidémie Suspectée</p>
            <h4 className="font-serif italic text-2xl text-slate-900 mb-2">{alert.disease}</h4>
            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-4">{alert.count} cas signalés • {alert.location}</p>
            
            <div className="bg-slate-50 p-3 rounded border border-slate-200 mb-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Action requise</p>
              <p className="text-xs font-bold text-slate-800 leading-relaxed">{alert.recommendations}</p>
            </div>
            
            <div className="flex justify-between items-center mt-2 border-t border-slate-100 pt-4">
              <span className="text-[10px] bg-rose-50 text-rose-600 px-2 py-1 rounded border border-rose-100 font-bold uppercase tracking-widest">Actif</span>
              <button className="text-[10px] font-bold uppercase tracking-widest text-slate-900 hover:text-slate-600 transition-colors">
                Notifier District →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

