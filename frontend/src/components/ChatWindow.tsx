import { useState, useRef, useEffect, useCallback } from 'react';
import { apiFetch } from '@/services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/AuthContext';
import { 
  Send, 
  Bot, 
  User as UserIcon, 
  Loader2, 
  BookOpen, 
  Mic, 
  MicOff, 
  FileText, 
  HelpCircle, 
  Activity,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Trophy,
  ArrowRight,
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Source {
  course: string;
  page: number;
  text: string;
}

interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
}

interface Message {
  role: 'user' | 'ai';
  text: string;
  sources?: Source[];
  quiz?: QuizQuestion[];
}

interface SpeechRecognitionEvent extends Event {
  results: {
    [key: number]: {
      [key: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: { error: string }) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

export default function ChatWindow({ semesterId, initialQuizCourse }: { semesterId: number, initialQuizCourse?: string | null }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  // Quiz State
  const [activeQuiz, setActiveQuiz] = useState<QuizQuestion[] | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const handleQuizStart = useCallback(async (courseName: string) => {
    setLoading(true);
    try {
      const quizData = await apiFetch(`/ai/quiz?course_name=${encodeURIComponent(courseName)}&semester_id=${semesterId}`, {
        method: 'POST',
      });
      
      const safeQuiz = Array.isArray(quizData) ? quizData : [];
      if (safeQuiz.length > 0) {
        setActiveQuiz(safeQuiz);
        setCurrentQuestionIdx(0);
        setScore(0);
        setSelectedOption(null);
        setIsCorrect(null);
        setShowFeedback(false);
      } else {
        setMessages(prev => [...prev, { role: 'ai', text: "Désolé, je n'ai pas pu générer de quiz pour le moment." }]);
      }
    } catch (err) {
      console.error('[ChatWindow] Quiz failed:', err);
      setMessages(prev => [...prev, { role: 'ai', text: "Une erreur est survenue lors de la génération du quiz." }]);
    } finally {
      setLoading(false);
    }
  }, [semesterId]);

  useEffect(() => {
    if (initialQuizCourse) {
      handleQuizStart(initialQuizCourse);
    }
  }, [initialQuizCourse, handleQuizStart]);

  const handleOptionSelect = (option: string) => {
    if (showFeedback || !activeQuiz) return;
    
    const correct = option === activeQuiz[currentQuestionIdx].answer;
    setSelectedOption(option);
    setIsCorrect(correct);
    setShowFeedback(true);
    
    if (correct) setScore(prev => prev + 1);

    // Auto-advance after delay
    setTimeout(() => {
      if (currentQuestionIdx < activeQuiz.length - 1) {
        setCurrentQuestionIdx(prev => prev + 1);
        setSelectedOption(null);
        setIsCorrect(null);
        setShowFeedback(false);
      } else {
        // Quiz Finished
        const finalScore = correct ? score + 1 : score;
        setMessages(prev => [...prev, { 
          role: 'ai', 
          text: `Quiz terminé ! Votre score final est de ${finalScore}/${activeQuiz.length}.` 
        }]);
        setActiveQuiz(null);
      }
    }, 2000);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const win = window as unknown as { 
        SpeechRecognition: new () => SpeechRecognition; 
        webkitSpeechRecognition: new () => SpeechRecognition; 
      };
      const SpeechRecognitionConstructor = win.SpeechRecognition || win.webkitSpeechRecognition;
      
      if (SpeechRecognitionConstructor) {
        const recognition = new SpeechRecognitionConstructor();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'fr-FR';

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = event.results[0][0].transcript;
          setInput((prev) => prev + (prev ? ' ' : '') + transcript);
          setIsListening(false);
        };

        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);
        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setIsListening(true);
      recognitionRef.current?.start();
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, activeQuiz]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = { role: 'user', text: input };
    setMessages((prev) => [...prev, userMsg]);
    const currentInput = input;
    setInput('');
    setLoading(true);

    try {
      const data = await apiFetch(`/ai/chat?query=${encodeURIComponent(currentInput)}&semester_id=${semesterId}`, {
        method: 'POST',
      });
      const aiMsg: Message = { 
        role: 'ai', 
        text: data.response,
        sources: data.sources 
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [...prev, { role: 'ai', text: "Erreur lors de la communication avec l'IA. Vérifiez votre connexion." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col bg-[#0d1117] h-full relative overflow-hidden font-sans">
      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 md:p-12 space-y-10 scroll-smooth custom-scrollbar"
      >
        <AnimatePresence mode="wait">
          {activeQuiz ? (
            <motion.div 
              key="quiz-mode"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="h-full flex items-center justify-center py-10"
            >
              <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                {/* Quiz Content */}
                <div className="lg:col-span-8 space-y-10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2ea043]">Mode Quiz Interactif</span>
                      <h2 className="text-3xl font-black text-white tracking-tight">Question {currentQuestionIdx + 1} <span className="text-gray-600">/ {activeQuiz.length}</span></h2>
                    </div>
                    <button 
                      onClick={() => setActiveQuiz(null)}
                      className="p-3 rounded-2xl bg-[#161b22] border border-[#30363d] text-gray-500 hover:text-white transition-all"
                    >
                      <RotateCcw size={20} />
                    </button>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-2 w-full bg-[#161b22] rounded-full overflow-hidden border border-[#30363d]">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${((currentQuestionIdx + 1) / activeQuiz.length) * 100}%` }}
                      className="h-full bg-[#2ea043] shadow-[0_0_15px_rgba(46,160,67,0.5)]"
                    />
                  </div>

                  <div className="bg-[#161b22] border border-[#30363d] rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                      <HelpCircle size={120} />
                    </div>
                    
                    <p className="text-2xl font-bold text-white mb-12 relative z-10 leading-tight">
                      {activeQuiz[currentQuestionIdx].question}
                    </p>

                    <div className="grid grid-cols-1 gap-4 relative z-10">
                      {activeQuiz[currentQuestionIdx].options.map((opt, idx) => {
                        const isSelected = selectedOption === opt;
                        const isCorrectAnswer = opt === activeQuiz[currentQuestionIdx].answer;
                        
                        let buttonClass = "bg-[#0d1117] border-[#30363d] text-gray-400 hover:border-[#2ea043] hover:text-white";
                        if (showFeedback) {
                          if (isCorrectAnswer) buttonClass = "bg-[#2ea043]/20 border-[#2ea043] text-[#2ea043] shadow-[0_0_20px_rgba(46,160,67,0.1)]";
                          else if (isSelected) buttonClass = "bg-red-500/20 border-red-500 text-red-500";
                          else buttonClass = "bg-[#0d1117] border-[#30363d] text-gray-600 opacity-50";
                        }

                        return (
                          <motion.button
                            key={idx}
                            whileHover={!showFeedback ? { x: 10 } : {}}
                            onClick={() => handleOptionSelect(opt)}
                            disabled={showFeedback}
                            className={cn(
                              "w-full p-6 rounded-2xl border-2 text-left transition-all flex items-center justify-between group",
                              buttonClass
                            )}
                          >
                            <span className="font-bold text-lg">{opt}</span>
                            <div className={cn(
                              "w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all",
                              isSelected ? "bg-current border-transparent" : "border-inherit group-hover:border-[#2ea043]"
                            )}>
                              {showFeedback && isCorrectAnswer && <CheckCircle2 size={18} className="text-[#161b22]" />}
                              {showFeedback && isSelected && !isCorrectAnswer && <XCircle size={18} className="text-[#161b22]" />}
                              {!showFeedback && <ChevronRight size={18} className="opacity-0 group-hover:opacity-100" />}
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Feedback Popup */}
                  <AnimatePresence>
                    {showFeedback && (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={cn(
                          "p-6 rounded-[1.5rem] border flex items-center gap-4 shadow-2xl",
                          isCorrect ? "bg-[#2ea043]/10 border-[#2ea043]/20 text-[#2ea043]" : "bg-red-500/10 border-red-500/20 text-red-400"
                        )}
                      >
                        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg", isCorrect ? "bg-[#2ea043]" : "bg-red-500")}>
                          {isCorrect ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                        </div>
                        <div>
                          <p className="font-black uppercase tracking-widest text-xs mb-1">{isCorrect ? 'Excellent !' : 'Oups...'}</p>
                          <p className="font-bold">{isCorrect ? 'C\'est la bonne réponse.' : `La réponse était : ${activeQuiz[currentQuestionIdx].answer}`}</p>
                        </div>
                        <div className="ml-auto flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-50">
                          Suivant dans 2s <ArrowRight size={14} className="animate-bounce-x" />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Score Panel */}
                <div className="lg:col-span-4 space-y-6">
                  <div className="bg-[#161b22] border border-[#30363d] rounded-[2rem] p-8 shadow-2xl">
                    <div className="w-16 h-16 rounded-2xl bg-[#2ea043]/10 flex items-center justify-center text-[#2ea043] mb-6 border border-[#2ea043]/20 shadow-inner">
                      <Trophy size={32} />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-2">Votre Score Actuel</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-6xl font-black text-white">{score}</span>
                      <span className="text-xl font-bold text-gray-600">pts</span>
                    </div>
                  </div>

                  <div className="bg-[#161b22] border border-[#30363d] rounded-[2rem] p-8 shadow-2xl">
                    <h4 className="text-xs font-black uppercase tracking-[0.2em] text-white mb-6 flex items-center gap-2">
                      <Activity size={16} className="text-[#2ea043]" /> Statistiques
                    </h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-500">Précision</span>
                        <span className="text-xs font-black text-white">{currentQuestionIdx > 0 ? Math.round((score / currentQuestionIdx) * 100) : 0}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-500">Restant</span>
                        <span className="text-xs font-black text-white">{activeQuiz.length - currentQuestionIdx - 1} questions</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : messages.length === 0 ? (
            <motion.div 
              key="empty-state"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex h-full flex-col items-center justify-center text-center max-w-2xl mx-auto"
            >
              <div className="relative mb-10">
                <div className="absolute inset-0 bg-[#2ea043]/20 blur-[40px] rounded-full animate-pulse" />
                <div className="relative w-24 h-24 bg-[#161b22] rounded-[2rem] flex items-center justify-center border border-[#30363d] shadow-2xl">
                  <Bot className="text-[#2ea043]" size={48} />
                </div>
              </div>
              <h1 className="text-4xl font-black mb-4 text-white tracking-tight">Bonjour {user?.full_name || 'Étudiant'},</h1>
              <p className="text-gray-500 text-lg font-medium leading-relaxed mb-12">
                Votre assistant académique intelligent est prêt pour le <span className="text-[#2ea043] font-black">Semestre {semesterId}</span>. Posez vos questions sur les cours ou générez des quiz.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                {[
                  { hint: 'Explique ce cours', icon: BookOpen },
                  { hint: 'Résumé du chapitre', icon: FileText },
                  { hint: 'Génère un quiz', icon: HelpCircle },
                  { hint: 'Points clés', icon: Activity }
                ].map((item) => (
                  <button 
                    key={item.hint}
                    onClick={() => setInput(item.hint)}
                    className="group p-5 bg-[#161b22] border border-[#30363d] rounded-2xl hover:border-[#2ea043]/50 transition-all text-left shadow-xl hover:shadow-2xl hover:shadow-[#2ea043]/5 flex items-center gap-4"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#0d1117] border border-[#30363d] flex items-center justify-center text-gray-500 group-hover:text-[#2ea043] transition-colors">
                      <item.icon size={18} />
                    </div>
                    <span className="text-sm font-bold text-gray-400 group-hover:text-white transition-colors">{item.hint}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <div key="messages-list">
              {messages.map((msg, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex gap-6 max-w-5xl mx-auto w-full mb-10",
                    msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-lg transition-transform hover:scale-105",
                    msg.role === 'user' ? "bg-[#238636] border-[#2ea043] shadow-[#238636]/20" : "bg-[#161b22] border-[#30363d]"
                  )}>
                    {msg.role === 'user' ? <UserIcon size={20} className="text-white" /> : <Bot size={20} className="text-[#2ea043]" />}
                  </div>
                  <div className={cn(
                    "flex flex-col gap-3 max-w-[80%]",
                    msg.role === 'user' ? "items-end" : "items-start"
                  )}>
                    <div className={cn(
                      "px-6 py-4 rounded-[1.8rem] text-sm leading-relaxed shadow-xl whitespace-pre-wrap font-medium",
                      msg.role === 'user' ? "chat-bubble-user" : "chat-bubble-ai"
                    )}>
                      {msg.text}
                    </div>

                    {/* Sources Display */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {msg.sources.map((s, idx) => (
                          <div key={idx} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#161b22] border border-[#30363d] text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-[#2ea043] hover:border-[#2ea043]/30 transition-all cursor-default">
                            <BookOpen size={12} />
                            {s.course} • Page {s.page}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
        
        {loading && !activeQuiz && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex gap-6 max-w-5xl mx-auto w-full"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#161b22] border border-[#30363d] flex items-center justify-center shadow-lg">
              <Loader2 className="text-[#2ea043] animate-spin" size={20} />
            </div>
            <div className="bg-[#161b22] border border-[#30363d] px-6 py-4 rounded-[1.8rem] rounded-tl-none shadow-xl">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-[#2ea043] rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-[#2ea043] rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 bg-[#2ea043] rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-6 md:p-10 bg-gradient-to-t from-[#0d1117] via-[#0d1117] to-transparent shrink-0">
        <div className="max-w-4xl mx-auto relative group">
          <div className="absolute inset-0 bg-[#2ea043]/5 blur-[20px] rounded-[2rem] opacity-0 group-focus-within:opacity-100 transition-opacity" />
          <div className="relative flex items-end gap-4 bg-[#161b22] border border-[#30363d] rounded-[2rem] p-3 pl-6 shadow-2xl focus-within:border-[#2ea043]/50 transition-all">
            <textarea 
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
              placeholder="Posez votre question académique ici..."
              className="flex-1 bg-transparent border-none outline-none py-3 text-sm text-white placeholder:text-gray-600 resize-none max-h-48 custom-scrollbar"
            />
            <div className="flex items-center gap-2 pb-1.5 pr-1.5">
              <button 
                onClick={toggleListening}
                className={cn(
                  "p-3 rounded-xl transition-all",
                  isListening ? "bg-red-500 text-white animate-pulse" : "text-gray-500 hover:text-white hover:bg-[#21262d]"
                )}
              >
                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
              <button 
                onClick={handleSend}
                disabled={!input.trim() || loading || !!activeQuiz}
                className="p-3 bg-[#238636] text-white rounded-xl hover:bg-[#2ea043] transition-all disabled:opacity-30 disabled:grayscale shadow-lg shadow-[#238636]/20 active:scale-95"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
          <p className="mt-3 text-center text-[10px] font-bold text-gray-600 uppercase tracking-widest">
            EMSI Copilot peut faire des erreurs. Vérifiez les sources officielles.
          </p>
        </div>
      </div>
    </div>
  );
}

