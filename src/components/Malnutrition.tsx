import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Image as ImageIcon, Loader2, AlertTriangle, Info, CheckCircle, X } from 'lucide-react';
import { analyzeMalnutritionImages } from '../services/aiService';
import { useAppContext } from '../context/AppContext';

export default function Malnutrition() {
  const { addMalnutritionCheck, setFollowUp } = useAppContext();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [followUpSet, setFollowUpSet] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles = files.filter(f => f.type.startsWith('image/'));
    if (validFiles.length === 0) {
      setError('Veuillez sélectionner des images valides.');
      return;
    }

    setResult(null);
    setError('');

    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImages(prev => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
    
    // Clear input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (idx: number) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
    setResult(null);
    setCurrentId(null);
    setFollowUpSet(false);
  };

  const clearImages = () => {
    setImages([]);
    setResult(null);
    setError('');
    setCurrentId(null);
    setFollowUpSet(false);
  };

  const handleAnalyze = async () => {
    if (images.length === 0) {
      setError("Veuillez ajouter au moins une photo avant l'analyse.");
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const res = await analyzeMalnutritionImages(images);
      setResult(res);
      const id = addMalnutritionCheck({
        imageUrl: images[0], // Store primary image in history for simplicity
        ...res
      });
      setCurrentId(id);

      // Auditory Feedback
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(
          `L'analyse IA indique un risque ${res.riskLevel}. ${res.analysis.replace(/[*#_`]/g, '')}`
        );
        utterance.lang = 'fr-FR';
        window.speechSynthesis.speak(utterance);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erreur lors de l'analyse des images. Assurez-vous d'avoir une bonne connexion.");
    } finally {
      setLoading(false);
    }
  };

  const handlePlanFollowUp = () => {
    if (currentId) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setFollowUp(currentId, 'malnutrition', tomorrow.toISOString());
      setFollowUpSet(true);
    }
  };

  const getRiskStyle = (level: string) => {
    switch(level) {
      case 'Élevé': return { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-900', badge: 'bg-rose-600 text-white' };
      case 'Modéré': return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-900', badge: 'bg-amber-600 text-white' };
      default: return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-900', badge: 'bg-emerald-600 text-white' };
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="p-8 bg-white border-r border-slate-200 min-h-full"
    >
      <div className="mb-8">
        <h2 className="text-4xl font-serif italic mb-2 leading-tight">Dépistage<br/>Malnutrition</h2>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Prenez une photo de l'enfant pour analyser les signes.</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
          {error}
        </div>
      )}

      {!images.length ? (
        <div className="space-y-4">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 bg-slate-50 rounded-2xl p-8 flex flex-col items-center justify-center text-slate-500 cursor-pointer hover:bg-slate-100 transition-colors h-64"
          >
            <Camera className="w-12 h-12 mb-3 text-slate-400" />
            <p className="font-bold text-sm tracking-widest uppercase text-slate-700">Prendre des photos</p>
            <p className="text-[10px] uppercase tracking-widest opacity-60 mt-2 text-center">Vous pouvez sélectionner plusieurs images</p>
          </div>
          <input 
            type="file" 
            accept="image/*" 
            capture="environment"
            multiple
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
          />
          
          <div className="bg-slate-50 p-4 rounded-xl flex gap-3 text-slate-600 border border-slate-200">
            <Info className="w-5 h-5 shrink-0 text-slate-400" />
            <p className="text-xs leading-relaxed">Prenez plusieurs photos : visage, cheveux, membres (recherche d'œdèmes) dans un endroit bien éclairé.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {images.map((imgUrl, idx) => (
              <div key={idx} className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-200 aspect-square">
                <img 
                  src={imgUrl} 
                  alt={`Patient ${idx + 1}`} 
                  className={`w-full h-full object-cover transition-opacity duration-300 ${loading ? 'opacity-50' : 'opacity-100'}`} 
                />
                {!loading && !result && (
                  <button 
                    onClick={() => removeImage(idx)}
                    className="absolute top-2 right-2 bg-slate-900/60 p-1.5 rounded-full text-white hover:bg-rose-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            
            {!loading && !result && (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 bg-slate-50 rounded-xl flex flex-col items-center justify-center text-slate-500 cursor-pointer hover:bg-slate-100 transition-colors aspect-square"
              >
                <span className="font-bold text-2xl">+</span>
                <span className="text-[10px] uppercase font-bold tracking-widest mt-1">Ajouter</span>
              </div>
            )}
            
            <input 
              type="file" 
              accept="image/*" 
              multiple
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
            />
          </div>
            
          {loading && (
             <div className="w-full flex justify-center py-4">
                <motion.div 
                   animate={{ opacity: [1, 0.5, 1] }} 
                   transition={{ repeat: Infinity, duration: 1.5 }}
                   className="flex items-center gap-2 text-emerald-600 font-bold text-sm tracking-widest uppercase"
                >
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Analyse des images...</span>
                </motion.div>
             </div>
          )}

          {!result ? (
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="w-full mt-4 bg-slate-900 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-black transition-colors flex items-center justify-center gap-2 disabled:opacity-70 relative overflow-hidden"
            >
              {!loading && (
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  <span>Lancer le diagnostic unifié</span>
                </div>
              )}
            </button>
          ) : (
            (() => {
              const style = getRiskStyle(result.riskLevel);
              return (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`${style.bg} border-2 ${style.border} rounded-2xl p-6 relative mt-6`}
                >
                  <div className={`absolute -top-3 right-6 ${style.badge} px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm`}>
                    Risque: {result.riskLevel}
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                      <span>Score IA</span>
                      <span className={style.text}>{result.riskScore}/100</span>
                    </div>
                    <div className="w-full bg-slate-200/50 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${result.riskScore > 75 ? 'bg-rose-500' : result.riskScore > 30 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                        style={{ width: `${result.riskScore}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-slate-200 mb-4 shadow-sm">
                    <p className="text-[10px] font-bold uppercase text-slate-500 mb-1 tracking-widest">Analyse détaillée</p>
                    <p className={`text-sm font-serif italic ${style.text} leading-relaxed`}>{result.analysis}</p>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-bold uppercase text-slate-500 mb-1 tracking-widest">Recommandations</p>
                    <p className="text-sm font-bold text-slate-900 leading-relaxed">{result.recommendations}</p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 mt-6">
                    {(result.riskLevel === 'Élevé' || result.riskLevel === 'Modéré') && !followUpSet && (
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
                      onClick={clearImages}
                      className="flex-1 bg-white text-slate-900 border border-slate-200 py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-colors"
                    >
                      Nouveau Patient
                    </button>
                  </div>
                </motion.div>
              );
            })()
          )}
        </div>
      )}
    </motion.div>
  );
}
