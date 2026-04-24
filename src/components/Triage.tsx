import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { analyzeSymptoms, transcribeAudio } from '../services/aiService';
import { useAppContext } from '../context/AppContext';
import { Leaf, Loader2, AlertTriangle, CheckCircle, Activity, Thermometer, Mic, MicOff } from 'lucide-react';

export default function Triage() {
  const { addCase, setFollowUp } = useAppContext();
  
  const [age, setAge] = useState<number | ''>('');
  const [weight, setWeight] = useState<number | ''>('');
  const [sex, setSex] = useState<'M' | 'F'>('M');
  const [symptoms, setSymptoms] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState<{ age?: string, weight?: string, symptoms?: string, global?: string }>({});

  useEffect(() => {
    let interval: any;
    if (loading) {
      setProgress(0);
      interval = setInterval(() => {
        setProgress(p => p < 90 ? p + (90 - p) * 0.1 : p);
      }, 500);
    } else {
      setProgress(100);
      setTimeout(() => setProgress(0), 1000);
    }
    return () => clearInterval(interval);
  }, [loading]);
  
  const [result, setResult] = useState<null | any>(null);
  const [currentCaseId, setCurrentCaseId] = useState<string | null>(null);
  const [followUpSet, setFollowUpSet] = useState(false);

  // Microphone recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);

  const toggleRecording = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());

        setIsTranscribing(true);
        setErrors(prev => ({...prev, global: undefined}));

        try {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Audio = reader.result as string;
            const text = await transcribeAudio(base64Audio, 'audio/webm');
            setSymptoms(prev => (prev ? prev + "\n" + text : text));
          };
        } catch (err: any) {
          console.error(err);
          setErrors(prev => ({...prev, global: "Erreur lors de la transcription vocale."}));
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setErrors(prev => ({...prev, global: undefined}));
    } catch (err: any) {
      console.error(err);
      setErrors(prev => ({...prev, global: "Impossible d'accéder au microphone."}));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Inline validation
    const newErrors: typeof errors = {};
    if (!age) newErrors.age = 'L\'âge est requis.';
    else if (age <= 0 || age > 120) newErrors.age = 'L\'âge doit être entre 1 et 120.';
    
    if (!weight) newErrors.weight = 'Le poids est requis.';
    else if (weight <= 0 || weight > 200) newErrors.weight = 'Le poids doit être réaliste.';
    
    if (!symptoms.trim()) newErrors.symptoms = 'Les symptômes sont requis pour l\'analyse.';
    else if (symptoms.trim().length < 5) newErrors.symptoms = 'Décrivez plus précisément les symptômes (min 5 caractères).';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setErrors({});
    
    try {
      const res = await analyzeSymptoms(symptoms, Number(age), Number(weight), sex);
      setResult(res);
      const id = addCase({
        age: Number(age),
        weight: Number(weight),
        sex,
        symptoms,
        ...res
      });
      setCurrentCaseId(id);
    } catch (err: any) {
      console.error(err);
      setErrors({ global: err.message || 'Une erreur est survenue lors de l\'analyse. Veuillez vérifier votre connexion.' });
    } finally {
      setLoading(false);
    }
  };

  const getSeverityStyle = (sev: string) => {
    switch(sev) {
      case 'Critique': return { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-900', badge: 'bg-rose-600 text-white' };
      case 'Urgent': return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-900', badge: 'bg-amber-600 text-white' };
      case 'Modéré': return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900', badge: 'bg-blue-600 text-white' };
      default: return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-900', badge: 'bg-emerald-600 text-white' };
    }
  };

  const resetForm = () => {
    setAge('');
    setWeight('');
    setSex('M');
    setSymptoms('');
    setResult(null);
    setCurrentCaseId(null);
    setFollowUpSet(false);
  }

  const handlePlanFollowUp = () => {
    if (currentCaseId) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setFollowUp(currentCaseId, 'case', tomorrow.toISOString());
      setFollowUpSet(true);
    }
  };

  if (result) {
    const style = getSeverityStyle(result.severity);
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="p-8 space-y-8 bg-white border-b border-slate-200 min-h-full"
      >
        <div>
          <h2 className="text-4xl font-serif italic mb-2 leading-tight">Analyse<br/>Terminée</h2>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Diagnostic IA & Recommandations</p>
        </div>
        
        <div className={`${style.bg} border-2 ${style.border} rounded-2xl p-6 relative`}>
          <div className={`absolute -top-3 right-6 ${style.badge} px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm`}>
            Niveau: {result.severity}
          </div>
          
          <h3 className={`text-2xl font-serif italic ${style.text} mb-4`}>{result.diagnosis}</h3>
          
          <div className="bg-white rounded-lg p-4 border border-slate-200 mb-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase text-slate-500 mb-1 tracking-widest">Conduite à tenir</p>
            <p className="text-sm font-bold text-slate-900">{result.instructions}</p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
            <p className="text-[10px] font-bold uppercase text-slate-500 mb-1 tracking-widest">Médicaments suggérés</p>
            <p className="text-sm text-slate-800">{result.medications}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {(result.severity === 'Critique' || result.severity === 'Urgent') && !followUpSet && (
            <button 
              onClick={handlePlanFollowUp}
              className="flex-1 bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100 py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-colors"
            >
              + Programmer Suivi (24h)
            </button>
          )}
          {followUpSet && (
            <div className="flex-1 flex items-center justify-center gap-2 bg-emerald-50 text-emerald-600 border border-emerald-200 py-4 rounded-xl font-bold uppercase tracking-widest text-[10px]">
              <CheckCircle className="w-4 h-4" /> Suivi Programmé
            </div>
          )}
          
          <button 
            onClick={resetForm}
            className="flex-1 bg-slate-900 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-black transition-colors"
          >
            Nouveau Patient
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="p-8 bg-white border-r border-slate-200 min-h-full"
    >
      <div className="mb-8">
        <h2 className="text-4xl font-serif italic mb-2 leading-tight">Nouveau<br/>Triage Patient</h2>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Saisissez les informations du patient.</p>
      </div>

      {errors.global && (
        <div className="mb-4 p-3 bg-rose-50 text-rose-700 rounded-lg text-sm border border-rose-200 shadow-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          {errors.global}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2 relative">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Âge (années)</label>
            <input 
              type="number" 
              value={age}
              onChange={e => { setAge(e.target.value ? Number(e.target.value) : ''); setErrors(prev => ({...prev, age: undefined})); }}
              className={`w-full p-3 bg-slate-50 border ${errors.age ? 'border-rose-400 focus:border-rose-600' : 'border-slate-200 focus:border-slate-900'} rounded focus:bg-white focus:outline-none transition-colors text-sm`}
              placeholder="Ex: 5"
              step="0.1"
              min="0"
            />
            {errors.age && <span className="absolute -bottom-4 md:-bottom-5 left-0 text-[9px] font-bold text-rose-600 uppercase tracking-widest">{errors.age}</span>}
          </div>
          <div className="space-y-2 relative">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Poids (kg)</label>
            <input 
              type="number" 
              value={weight}
              onChange={e => { setWeight(e.target.value ? Number(e.target.value) : ''); setErrors(prev => ({...prev, weight: undefined})); }}
              className={`w-full p-3 bg-slate-50 border ${errors.weight ? 'border-rose-400 focus:border-rose-600' : 'border-slate-200 focus:border-slate-900'} rounded focus:bg-white focus:outline-none transition-colors text-sm`}
              placeholder="Ex: 15"
              step="0.1"
              min="0"
            />
            {errors.weight && <span className="absolute -bottom-4 md:-bottom-5 left-0 text-[9px] font-bold text-rose-600 uppercase tracking-widest">{errors.weight}</span>}
          </div>
        </div>

        <div className="space-y-2 mt-6">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Sexe</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSex('M')}
              className={`p-3 rounded border text-center font-bold text-sm transition-colors uppercase tracking-widest ${sex === 'M' ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600'}`}
            >
              Garçon
            </button>
            <button
              type="button"
              onClick={() => setSex('F')}
              className={`p-3 rounded border text-center font-bold text-sm transition-colors uppercase tracking-widest ${sex === 'F' ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600'}`}
            >
              Fille
            </button>
          </div>
        </div>

        <div className="space-y-2 relative pt-2">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Symptômes observés</label>
            <button
              type="button"
              onClick={toggleRecording}
              disabled={isTranscribing}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${isRecording ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {isTranscribing ? (
                <><Loader2 className="w-3 h-3 animate-spin" /> Traitement</>
              ) : isRecording ? (
                <><MicOff className="w-3 h-3" /> Stop</>
              ) : (
                <><Mic className="w-3 h-3" /> Dictée Vocale</>
              )}
            </button>
          </div>
          <textarea
            value={symptoms}
            onChange={e => { setSymptoms(e.target.value); setErrors(prev => ({...prev, symptoms: undefined})); }}
            rows={4}
            className={`w-full p-3 bg-slate-50 border ${errors.symptoms ? 'border-rose-400 focus:border-rose-600' : 'border-slate-200 focus:border-slate-900'} rounded focus:bg-white focus:outline-none transition-colors resize-none text-sm`}
            placeholder="Ex: forte fièvre, toux sèche, perte d'appétit, fatigue intense depuis 2 jours..."
            disabled={isTranscribing}
          ></textarea>
          {errors.symptoms && <span className="absolute -bottom-4 left-0 text-[9px] font-bold text-rose-600 uppercase tracking-widest">{errors.symptoms}</span>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-8 bg-slate-900 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-black transition-all flex items-center justify-center gap-2 relative overflow-hidden"
        >
          {loading ? (
             <div className="w-full px-4 flex flex-col gap-2">
                <div className="flex items-center justify-between text-[10px] text-emerald-400">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyse des symptômes...</span>
                  </div>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
                  <motion.div 
                    className="h-full bg-emerald-500"
                    animate={{ width: `${progress}%` }}
                    transition={{ ease: "linear" }}
                  />
                </div>
             </div>
          ) : (
            <div className="flex items-center gap-2">
              <Thermometer className="w-5 h-5" />
              <span>Obtenir un Triage</span>
            </div>
          )}
        </button>
      </form>
    </motion.div>
  );
}
