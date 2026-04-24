import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Loader2, Volume2, VolumeX, Mic, MicOff, PhoneCall, Siren } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { chatWithAI, transcribeAudio, generateTTSUrl } from '../services/aiService';

type Message = { role: 'user' | 'model', text: string };

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Bonjour. Je suis l\'assistant IA SantéAI. Comment puis-je vous aider aujourd\'hui dans vos consultations ?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Voice Recording & Call Mode States
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isCallMode, setIsCallMode] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen, isCallMode]);

  const speak = async (text: string) => {
    if (!isSoundEnabled) return;
    
    // Fallback to browser TTS if generating URL fails or is unavailable
    const fallbackTTS = () => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const cleanText = text.replace(/[*#_`]/g, '');
            const utterance = new SpeechSynthesisUtterance(cleanText);
            utterance.lang = 'fr-FR';
            utterance.rate = 1.0; 
            window.speechSynthesis.speak(utterance);
        }
    };

    try {
        const cleanText = text.replace(/[*#_`]/g, '');
        const audioUrl = await generateTTSUrl(cleanText);
        const audio = new Audio(audioUrl);
        audio.play().catch(e => {
            console.error("Could not play remote audio", e);
            fallbackTTS();
        });
    } catch(err) {
        console.error("Erreur de synthèse vocale remote", err);
        fallbackTTS();
    }
  };

  const handleSend = async (overrideText?: string) => {
    const textToSend = overrideText || input;
    if (!textToSend.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', text: textToSend.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    if (!overrideText) setInput('');
    setIsLoading(true);

    try {
      const formattedMessages = newMessages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const reply = await chatWithAI(formattedMessages);
      setMessages([...newMessages, { role: 'model', text: reply }]);
      speak(reply);
    } catch (error: any) {
      console.error(error);
      const errorMsg = `Désolé, une erreur est survenue : ${error.message || 'connexion impossible'}`;
      setMessages([...newMessages, { role: 'model', text: errorMsg }]);
      speak(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRecording = async (autoSend: boolean = false) => {
    if (isRecording) {
      if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());

        setIsTranscribing(true);
        try {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Audio = reader.result as string;
            const text = await transcribeAudio(base64Audio, 'audio/webm');
            
            if (autoSend) {
              await handleSend(text);
            } else {
              setInput(prev => (prev ? prev + " " + text : text));
            }
          };
        } catch (err: any) {
          console.error(err);
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access denied", err);
    }
  };

  const toggleSound = () => {
    if (isSoundEnabled) window.speechSynthesis.cancel();
    setIsSoundEnabled(!isSoundEnabled);
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-[90px] right-6 md:bottom-8 md:right-8 w-14 h-14 bg-slate-900 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-black transition-all z-40 ${isOpen ? 'scale-0' : 'scale-100'}`}
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed inset-0 md:inset-8 bg-white md:rounded-2xl shadow-2xl md:border md:border-slate-200 flex flex-col z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center font-bold text-sm">S+</div>
                <div>
                  <h3 className="font-bold text-sm">SantéAI Assistant</h3>
                  <p className="text-[10px] text-slate-300 uppercase tracking-widest font-bold">En ligne</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setIsCallMode(true)} className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-colors mr-2">
                  <PhoneCall className="w-3 h-3" /> Appel IA
                </button>
                <button onClick={toggleSound} className="text-slate-300 hover:text-white p-1 transition-colors" title={isSoundEnabled ? "Désactiver la voix" : "Activer la voix"}>
                  {isSoundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </button>
                <button onClick={() => setIsOpen(false)} className="text-slate-300 hover:text-white p-1 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-emerald-600 text-white rounded-br-none' : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-sm'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-white text-slate-500 border border-slate-200 rounded-bl-none shadow-sm flex items-center gap-2 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Assistant réfléchit...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white border-t border-slate-200 shrink-0">
              <form 
                onSubmit={e => { e.preventDefault(); handleSend(); }}
                className="flex items-center gap-2"
              >
                <button 
                  type="button"
                  onClick={() => toggleRecording(false)}
                  disabled={isTranscribing || isLoading}
                  className={`p-3 rounded-xl transition-colors ${isRecording ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  title={isRecording ? "Arrêter l'enregistrement" : "Enregistrer un message vocal"}
                >
                  {isTranscribing ? <Loader2 className="w-5 h-5 animate-spin" /> : (isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />)}
                </button>
                <input 
                  type="text" 
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder={isRecording ? "Écoute en cours..." : isTranscribing ? "Transcription..." : "Posez votre question médicale..."}
                  disabled={isRecording || isTranscribing}
                  className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-900 transition-colors disabled:opacity-50"
                />
                <button 
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="p-3 bg-emerald-600 text-white rounded-xl disabled:bg-slate-300 transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
            {/* Call Mode Overlay */}
            <AnimatePresence>
              {isCallMode && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-slate-900 z-50 flex flex-col items-center justify-center text-white"
                >
                  <div className="absolute top-4 right-4">
                    <button onClick={() => { setIsCallMode(false); if(isRecording) toggleRecording(); }} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  
                  <div className="text-center mb-12">
                    <div className="w-20 h-20 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(52,211,153,0.3)]">
                      <Siren className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-2xl font-serif italic mb-2">SantéAI Appel</h2>
                    <p className="text-emerald-400 text-sm font-bold tracking-widest uppercase mt-4">
                      {isRecording ? 'Écoute en cours...' : isTranscribing ? 'Analyse...' : isLoading ? 'Réponse...' : 'Prêt à écouter'}
                    </p>
                  </div>

                  <button 
                    onClick={() => toggleRecording(true)}
                    disabled={isTranscribing || isLoading}
                    className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-rose-500' : 'bg-slate-800 hover:bg-slate-700'} ${isTranscribing || isLoading ? 'opacity-50' : ''}`}
                  >
                    {isRecording && (
                      <motion.div 
                        className="absolute inset-0 rounded-full border-4 border-rose-500"
                        animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                      />
                    )}
                    {isRecording ? <MicOff className="w-10 h-10" /> : <Mic className="w-10 h-10" />}
                  </button>
                  
                  <p className="mt-8 text-xs text-slate-400 max-w-xs text-center">
                    Appuyez pour parler. SantéAI vous répondra vocalement.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
