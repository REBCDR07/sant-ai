import React from 'react';
import { useAppContext } from '../context/AppContext';
import { Clock, CalendarClock, CheckSquare, Square } from 'lucide-react';

export default function History() {
  const { cases, malnutritionChecks, clearHistory, toggleFollowUpCompleted } = useAppContext();

  const allItems = [
    ...cases.map(c => ({ type: 'case', time: new Date(c.timestamp), data: c })),
    ...malnutritionChecks.map(m => ({ type: 'malnutrition', time: new Date(m.timestamp), data: m }))
  ].sort((a, b) => b.time.getTime() - a.time.getTime());

  if (allItems.length === 0) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-[70vh] text-center bg-slate-50">
        <div className="bg-slate-200/50 p-6 rounded-full mb-4">
          <Clock className="w-8 h-8 text-slate-400" />
        </div>
        <h2 className="text-2xl font-serif italic text-slate-900">Historique Vide</h2>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-2">Aucun patient consulté.</p>
      </div>
    );
  }

  // Count pending follow-ups
  const pendingFollowUps = allItems.filter(i => i.data.followUpDate && !i.data.followUpCompleted).length;

  return (
    <div className="flex-1 p-8 bg-slate-50 min-h-full">
      {pendingFollowUps > 0 && (
        <div className="mb-8 p-4 bg-amber-50 border-l-4 border-amber-500 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-amber-800 mb-1">
              <CalendarClock className="w-4 h-4" />
              <h3 className="font-bold text-xs uppercase tracking-widest">Rappels de Suivi</h3>
            </div>
            <p className="text-[10px] text-amber-700/80 uppercase tracking-widest font-bold">
              {pendingFollowUps} patient(s) à revoir
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-between items-end mb-6">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Historique de Session</h2>
        <div className="flex gap-4 items-center">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden sm:block">Aujourd'hui : {allItems.length} acte(s)</p>
          <button 
            onClick={clearHistory}
            className="text-[10px] font-bold uppercase tracking-widest text-rose-600 border-b border-rose-600 pb-0.5"
          >
            Effacer
          </button>
        </div>
      </div>

      <div className="space-y-1">
        {allItems.map((item, idx) => {
          const timeStr = item.time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
          const isCase = item.type === 'case';
          
          let title = '';
          let subtitle = '';
          let severity = '';
          let dotColor = '';
          
          if (isCase) {
             title = `Patient (${item.data.age}a) - ${item.data.sex === 'M' ? 'Masc.' : 'Fém.'}`;
             subtitle = item.data.diagnosis;
             severity = item.data.severity;
             dotColor = severity === 'Critique' ? 'bg-rose-500' : severity === 'Urgent' ? 'bg-amber-500' : severity === 'Modéré' ? 'bg-blue-500' : 'bg-emerald-500';
          } else {
             title = 'Scan Visuel';
             subtitle = item.data.analysis;
             severity = item.data.riskLevel;
             dotColor = severity === 'Élevé' ? 'bg-rose-500' : severity === 'Modéré' ? 'bg-amber-500' : 'bg-emerald-500';
          }

          const hasFollowUp = !!item.data.followUpDate;
          const isCompleted = !!item.data.followUpCompleted;

          return (
             <div key={idx} className="group grid grid-cols-12 gap-3 py-4 border-b border-slate-200 items-start">
               <div className="col-span-2 font-mono text-xs text-slate-400 mt-1">{timeStr}</div>
               <div className="col-span-6">
                 <div className="flex items-center gap-2">
                   <p className={`font-serif italic leading-tight text-slate-900 ${isCompleted ? 'opacity-50 line-through' : ''}`}>{title}</p>
                   {hasFollowUp && (
                     <button 
                       onClick={() => toggleFollowUpCompleted(item.data.id, item.type as any)}
                       className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}
                     >
                       {isCompleted ? 'Suivi Fait' : 'À Suivre'}
                     </button>
                   )}
                 </div>
                 <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">{subtitle}</p>
               </div>
               <div className="col-span-4 text-right flex items-center justify-end mt-1">
                 <span className={`inline-block w-2 h-2 rounded-full ${dotColor}`}></span>
                 <span className="text-[10px] uppercase font-bold ml-2 tracking-widest text-slate-700 leading-none">{severity}</span>
               </div>
             </div>
          );
        })}
      </div>
      
      <button 
        onClick={() => window.print()}
        className="mt-12 text-[10px] font-bold uppercase tracking-widest text-slate-900 border-b border-slate-900 pb-1 w-full text-center hover:opacity-70 transition-opacity"
      >
        Exporter le Rapport (Imprimer)
      </button>
    </div>
  );
}

