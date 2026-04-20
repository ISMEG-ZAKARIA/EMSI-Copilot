'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import ChatWindow from '@/components/ChatWindow';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, 
  ChevronDown, 
  FolderOpen, 
  Search,
  Book,
  HelpCircle,
  ArrowLeft,
  MessageCircle,
  User as UserIcon,
} from 'lucide-react';
import { apiFetch, apiFetchBlob } from '@/services/api';
import { cn } from '@/lib/utils';
import PageTransition from '@/components/PageTransition';
import { Course } from '@/types/types';
import { useAuth } from '@/hooks/AuthContext';
import Image from 'next/image';

interface Subject {
  id: number;
  name: string;
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [selectedYear, setSelectedYear] = useState(1);
  const [selectedSemester, setSelectedSemester] = useState(1);
  const [viewMode, setViewMode] = useState<'chat' | 'browse'>('chat');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSubject, setExpandedSubject] = useState<number | null>(null);
  const [activeQuizCourse, setActiveQuizCourse] = useState<string | null>(null);
  const [chatKey, setChatKey] = useState(0);
  const chatHistory = [
    { id: '1', title: 'Cours Intelligence Artificielle' },
    { id: '2', title: 'Révisions Semestre 5' },
    { id: '3', title: 'Quiz Machine Learning' },
  ];

  const yearSemesters: Record<number, number[]> = {
    1: [1, 2],
    2: [3, 4],
    3: [5, 6],
    4: [7, 8],
    5: [9, 10]
  };

  const fetchContent = useCallback(async () => {
    setLoading(true);
    try {
      const [subjectsData, coursesData] = await Promise.all([
        apiFetch(`/courses/subjects?semester_id=${selectedSemester}`),
        apiFetch(`/courses/?semester_id=${selectedSemester}&year=${selectedYear}`)
      ]);
      
      const safeSubjects = Array.isArray(subjectsData) ? subjectsData : [];
      const safeCourses = Array.isArray(coursesData) ? coursesData : [];
      
      setSubjects(safeSubjects);
      setCourses(safeCourses);
      
      if (viewMode === 'browse' && safeSubjects.length > 0 && expandedSubject === null) {
        setExpandedSubject(safeSubjects[0].id);
      }
    } catch (err) {
      console.error('[StudentDashboard] fetchContent failed:', err);
      setSubjects([]);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, [selectedSemester, selectedYear, expandedSubject, viewMode]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    const firstSemester = yearSemesters[year][0];
    setSelectedSemester(firstSemester);
    // Fetch content immediately for the new semester
    setExpandedSubject(null);
  };

  const handleSemesterSelect = (id: number) => {
    setSelectedSemester(id);
    setSelectedYear(Math.ceil(id / 2));
    // Clear expanded subject when changing semesters
    setExpandedSubject(null);
    // Switch to browse mode when selecting a semester to see results
    setViewMode('browse');
  };

  const getCoursesForSubject = (subjectId: number) => {
    return courses.filter(course => 
      course.subject_id === subjectId && 
      (course.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
       course.subject_name?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  const startQuiz = (courseName: string) => {
    setActiveQuizCourse(courseName);
    setViewMode('chat');
  };

  return (
    <ProtectedRoute allowedRoles={['Student']}>
      <div className="flex h-screen bg-[#0d1117] text-[#c9d1d9] overflow-hidden font-sans selection:bg-[#2ea043]/30">
        <Sidebar 
          onSemesterSelect={handleSemesterSelect}
          onYearSelect={(y) => handleYearChange(y)}
          currentSemester={selectedSemester}
          currentYear={selectedYear}
          courses={courses}
          onCourseClick={(course) => {
            setViewMode('browse');
            setExpandedSubject(course.subject_id);
            // Scroll to course
            setTimeout(() => {
              const element = document.getElementById(`course-${course.id}`);
              element?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }}
          onNewChat={() => {
            setViewMode('chat');
            setActiveQuizCourse(null);
            setChatKey(prev => prev + 1);
          }}
          chatHistory={chatHistory}
          onHistoryClick={(id) => {
            console.log('Loading chat:', id);
            setViewMode('chat');
            setActiveQuizCourse(null);
            setChatKey(prev => prev + 1); // Reset for history
          }}
        />
        
        <main className="flex-1 flex flex-col relative overflow-hidden h-screen">
          <PageTransition>
            {/* Top Navigation / Toggle */}
            <div className="h-20 border-b border-[#30363d] flex items-center justify-between px-10 shrink-0 bg-[#0d1117]/80 backdrop-blur-xl z-20">
              <div className="flex items-center gap-6">
                {/* Back Button */}
                <button 
                  onClick={() => {
                    setViewMode('chat');
                    setActiveQuizCourse(null);
                  }}
                  className={cn(
                    "p-2.5 rounded-xl bg-[#161b22] border border-[#30363d] text-gray-500 hover:text-white hover:border-[#2ea043] transition-all flex items-center gap-2 group",
                    (viewMode === 'chat' && !activeQuizCourse) && "hidden"
                  )}
                >
                  <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Retour</span>
                </button>

                <button 
                  onClick={() => {
                    setViewMode('chat');
                    setActiveQuizCourse(null);
                    setChatKey(prev => prev + 1);
                  }}
                  className={cn(
                    "flex items-center gap-3 text-xs font-black uppercase tracking-[0.2em] transition-all relative py-8",
                    viewMode === 'chat' ? "text-[#2ea043]" : "text-gray-500 hover:text-white"
                  )}
                >
                  <MessageCircle size={18} /> Assistant IA
                  {viewMode === 'chat' && <motion.div layoutId="view-tab" className="absolute bottom-0 left-0 right-0 h-1 bg-[#2ea043] rounded-t-full shadow-[0_-4px_12px_rgba(46,160,67,0.4)]" />}
                </button>
                <button 
                  onClick={() => setViewMode('browse')}
                  className={cn(
                    "flex items-center gap-3 text-xs font-black uppercase tracking-[0.2em] transition-all relative py-8",
                    viewMode === 'browse' ? "text-[#2ea043]" : "text-gray-500 hover:text-white"
                  )}
                >
                  <Book size={18} /> Bibliothèque
                  {viewMode === 'browse' && <motion.div layoutId="view-tab" className="absolute bottom-0 left-0 right-0 h-1 bg-[#2ea043] rounded-t-full shadow-[0_-4px_12px_rgba(46,160,67,0.4)]" />}
                </button>
              </div>

                <div className="flex items-center gap-8">

                  
                  <div className="flex items-center gap-3 p-1.5 bg-[#161b22] rounded-2xl border border-[#30363d] shadow-inner">
                  <select 
                    className="bg-transparent px-4 py-2 text-[11px] font-black text-white uppercase tracking-widest outline-none cursor-pointer hover:text-[#2ea043] transition-colors"
                    value={selectedYear}
                    onChange={(e) => handleYearChange(Number(e.target.value))}
                  >
                    {[1, 2, 3, 4, 5].map(y => (
                      <option key={y} value={y} className="bg-[#161b22]">Année {y}</option>
                    ))}
                  </select>
                  <div className="w-px h-4 bg-[#30363d]" />
                  <select 
                    className="bg-transparent px-4 py-2 text-[11px] font-black text-white uppercase tracking-widest outline-none cursor-pointer hover:text-[#2ea043] transition-colors"
                    value={selectedSemester}
                    onChange={(e) => setSelectedSemester(Number(e.target.value))}
                  >
                    {yearSemesters[selectedYear].map(s => (
                      <option key={s} value={s} className="bg-[#161b22]">Semestre {s}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 relative overflow-hidden bg-[#0d1117] h-[calc(100vh-80px)]">
              <div className="absolute inset-0 overflow-y-auto custom-scrollbar">
                <AnimatePresence mode="wait">
                  {viewMode === 'chat' ? (
                    <motion.div 
                      key={`chat-${chatKey}`}
                      initial={{ opacity: 0, scale: 0.99, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.99, y: 10 }}
                      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                      className="h-full"
                    >
                      <ChatWindow semesterId={selectedSemester} initialQuizCourse={activeQuizCourse} />
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="browse"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="h-full p-10 md:p-16"
                    >
                    <div className="max-w-6xl mx-auto">
                      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
                        <div>
                          <motion.div 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2ea043]/10 border border-[#2ea043]/20 mb-4"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-[#2ea043] animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#2ea043]">Académie Digitale</span>
                          </motion.div>
                          <h2 className="text-5xl font-black text-white mb-4 tracking-tight leading-tight">Ressources Académiques</h2>
                          <p className="text-gray-400 text-lg font-medium max-w-xl leading-relaxed">Accédez instantanément à vos supports de cours, documents officiels et quiz de révision interactifs.</p>
                        </div>
                        <div className="relative w-full md:w-96 group">
                          <div className="absolute inset-0 bg-[#2ea043]/5 blur-xl rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
                          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#2ea043] transition-colors" size={20} />
                          <input 
                            className="w-full bg-[#161b22] border border-[#30363d] rounded-2xl pl-14 pr-6 py-4 outline-none focus:border-[#2ea043] focus:ring-4 focus:ring-[#2ea043]/5 text-sm transition-all shadow-2xl placeholder:text-gray-600 relative z-10"
                            placeholder="Rechercher une matière ou un cours..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-8">
                        {loading ? (
                          [1, 2, 3].map(i => (
                            <div key={i} className="bg-[#161b22] p-10 rounded-[2.5rem] border border-[#30363d] animate-pulse">
                              <div className="flex items-center gap-8">
                                <div className="w-16 h-16 rounded-2xl bg-[#0d1117]" />
                                <div className="space-y-4 flex-1">
                                  <div className="h-6 w-64 bg-[#0d1117] rounded-lg" />
                                  <div className="h-3 w-40 bg-[#0d1117] rounded-lg opacity-50" />
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          subjects.map((subject, idx) => {
                            const subjectCourses = getCoursesForSubject(subject.id);
                            if (searchTerm && subjectCourses.length === 0) return null;
                            
                            const isExpanded = expandedSubject === subject.id;
                            
                            return (
                              <motion.div 
                                key={subject.id}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05, type: 'spring', damping: 20 }}
                                className={cn(
                                  "bg-[#161b22] rounded-[2.5rem] border transition-all duration-700 overflow-hidden",
                                  isExpanded ? "border-[#2ea043]/40 shadow-[0_20px_50px_rgba(46,160,67,0.1)]" : "border-[#30363d] hover:border-[#8b949e]/40 hover:translate-y-[-4px]"
                                )}
                              >
                                <button 
                                  onClick={() => setExpandedSubject(isExpanded ? null : subject.id)}
                                  className="w-full p-10 flex items-center justify-between group text-left"
                                >
                                  <div className="flex items-center gap-8">
                                    <div className={cn(
                                      "w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-700",
                                      isExpanded ? "bg-[#2ea043] text-white shadow-[0_10px_30px_rgba(46,160,67,0.4)]" : "bg-[#0d1117] text-[#2ea043] border border-[#30363d]"
                                    )}>
                                      <FolderOpen size={36} className={cn("transition-transform duration-700", isExpanded && "scale-110")} />
                                    </div>
                                    <div>
                                      <h3 className="text-2xl font-black text-white mb-2 group-hover:text-[#2ea043] transition-colors tracking-tight">{subject.name}</h3>
                                      <div className="flex items-center gap-3">
                                        <span className="px-3 py-1 rounded-full bg-[#0d1117] border border-[#30363d] text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                          {subjectCourses.length} {subjectCourses.length > 1 ? 'Cours' : 'Cours'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className={cn(
                                    "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-700",
                                    isExpanded ? "bg-[#2ea043]/20 text-[#2ea043] rotate-180" : "bg-[#0d1117] text-gray-500 border border-[#30363d] group-hover:border-[#2ea043]/50 group-hover:text-[#2ea043]"
                                  )}>
                                    <ChevronDown size={24} />
                                  </div>
                                </button>

                                <AnimatePresence>
                                  {isExpanded && (
                                    <motion.div 
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ type: 'spring', damping: 25, stiffness: 150 }}
                                      className="border-t border-[#30363d] bg-[#0d1117]/40"
                                    >
                                      <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {subjectCourses.map(course => (
                                          <motion.div 
                                            key={course.id}
                                            whileHover={{ y: -6 }}
                                            className="p-8 rounded-3xl bg-[#161b22] border border-[#30363d] hover:border-[#2ea043] transition-all group relative overflow-hidden shadow-xl"
                                          >
                                            <div className="absolute inset-0 bg-gradient-to-br from-[#2ea043]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <div className="relative z-10">
                                              <div className="flex items-start justify-between mb-6">
                                                <div className="flex items-center gap-5">
                                                  <div className="w-12 h-12 rounded-2xl bg-[#0d1117] border border-[#30363d] flex items-center justify-center text-[#2ea043] group-hover:bg-[#2ea043] group-hover:text-white transition-all duration-500 shadow-inner">
                                                    <BookOpen size={24} />
                                                  </div>
                                                  <div>
                                                    <h4 className="text-lg font-black text-white group-hover:text-[#2ea043] transition-colors tracking-tight">{course.name}</h4>
                                                    <p className="text-[10px] font-black text-[#2ea043] uppercase tracking-[0.2em]">{course.documents?.length || 0} Supports</p>
                                                  </div>
                                                </div>
                                              </div>
                                              
                                              <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mb-8 group-hover:text-gray-400 transition-colors">
                                                {course.description || "Consultez les supports de cours et entraînez-vous avec l'assistant IA."}
                                              </p>

                                              <div className="flex items-center gap-3">
                                                <button 
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    startQuiz(course.name);
                                                  }}
                                                  className="flex-1 h-12 rounded-2xl bg-[#0d1117] border border-[#30363d] flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-[#2ea043] hover:border-[#2ea043]/50 transition-all active:scale-95"
                                                >
                                                  <HelpCircle size={18} /> Quiz IA
                                                </button>
                                                <button 
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    const element = document.getElementById(`course-${course.id}`);
                                                    element?.click();
                                                  }}
                                                  className="flex-[1.5] h-12 rounded-2xl bg-[#238636] text-white text-xs font-black uppercase tracking-widest hover:bg-[#2ea043] transition-all shadow-[0_10px_20px_rgba(35,134,54,0.3)] active:scale-95 flex items-center justify-center gap-3"
                                                >
                                                  <FolderOpen size={18} /> Ouvrir
                                                </button>
                                              </div>
                                            </div>
                                            {/* Course click trigger (invisible) */}
                                            <div 
                                              id={`course-${course.id}`}
                                              className="absolute inset-0 z-0 cursor-pointer"
                                              onClick={async () => {
                                                try {
                                                  if (course.documents && course.documents.length > 0) {
                                                    for (const doc of course.documents) {
                                                      const { blob, contentType } = await apiFetchBlob(`/courses/download/${doc.id}`);
                                                      const blobUrl = URL.createObjectURL(blob);
                                                      if (contentType === 'application/pdf') {
                                                        window.open(blobUrl, '_blank');
                                                      } else {
                                                        const link = document.createElement('a');
                                                        link.href = blobUrl;
                                                        link.download = doc.file_name || 'document';
                                                        document.body.appendChild(link);
                                                        link.click();
                                                        document.body.removeChild(link);
                                                      }
                                                      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
                                                    }
                                                  } else {
                                                    alert("Ce cours n'a pas encore de supports de cours.");
                                                  }
                                                } catch (err) {
                                                  console.error('[StudentDashboard] Error opening document:', err);
                                                  alert("Erreur lors de l'ouverture du document.");
                                                }
                                              }}
                                            />
                                          </motion.div>
                                        ))}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </motion.div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </PageTransition>
      </main>
    </div>
  </ProtectedRoute>
  );
}
