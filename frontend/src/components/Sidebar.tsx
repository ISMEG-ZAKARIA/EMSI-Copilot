import { useState, useEffect } from 'react';
import { apiFetch } from '@/services/api';
import { Course } from '@/types/types';
import { useAuth } from '@/hooks/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, 
  LogOut, 
  LayoutDashboard, 
  ChevronRight,
  PlusCircle,
  History,
  MessageCircle,
  Menu
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface ChatHistoryItem {
  id: string;
  title: string;
}

export default function Sidebar({ 
  onSemesterSelect,
  onYearSelect,
  currentSemester,
  currentYear,
  courses: initialCourses,
  onCourseClick,
  onNewChat,
  chatHistory = [],
  onHistoryClick
}: { 
  onSemesterSelect: (id: number) => void;
  onYearSelect?: (year: number) => void;
  currentSemester?: number;
  currentYear?: number;
  courses?: Course[];
  onCourseClick?: (course: Course) => void;
  onNewChat?: () => void;
  chatHistory?: ChatHistoryItem[];
  onHistoryClick?: (chatId: string) => void;
}) {
  const { user, logout } = useAuth();
  const [internalCourses, setInternalCourses] = useState<Course[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Use initialCourses if provided, otherwise fetch
  const courses = initialCourses || internalCourses;

  useEffect(() => {
    if (initialCourses) return;

    if (currentSemester) {
      const fetchCourses = async () => {
        try {
          const data = await apiFetch(`/courses/?semester_id=${currentSemester}${currentYear ? `&year=${currentYear}` : ''}`);
          setInternalCourses(data);
        } catch (err) {
          console.error(err);
        }
      };
      fetchCourses();
    }
  }, [currentSemester, currentYear, initialCourses]);

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#161b22] border-r border-[#30363d] relative">
      {/* Header / Logo */}
      <div className={cn(
        "p-6 flex items-center justify-between transition-all duration-300",
        isCollapsed ? "justify-center px-4" : "px-6"
      )}>
        <AnimatePresence mode="wait">
          {!isCollapsed || isMobileOpen ? (
            <motion.div
              key="logo-full"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex items-center gap-3 overflow-hidden"
            >
          <div className={cn(
            "p-1.5 bg-[#0d1117] rounded-lg border border-[#30363d] shrink-0 transition-all duration-500",
            !isCollapsed && "bg-gradient-to-br from-[#2ea043]/20 to-transparent"
          )}>
            <div className="w-6 h-6 flex items-center justify-center relative">
              <div className="absolute inset-0 bg-[#2ea043] blur-[8px] opacity-20 animate-pulse" />
              <Image src="/LOGO/image.png" alt="Logo" width={24} height={24} className="h-6 w-auto object-contain relative z-10" />
            </div>
          </div>
              <span className="text-lg font-black text-white tracking-tight truncate">EMSI Copilot</span>
            </motion.div>
          ) : (
            <motion.div
              key="logo-collapsed"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="p-1.5 bg-[#0d1117] rounded-lg border border-[#30363d] relative"
            >
              <div className="absolute inset-0 bg-[#2ea043] blur-[8px] opacity-10 animate-pulse" />
              <Image src="/LOGO/image.png" alt="Logo" width={24} height={24} className="h-6 w-6 object-contain relative z-10" />
            </motion.div>
          )
          }
        </AnimatePresence>
      </div>

      {/* Collapse Toggle - Desktop only */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="hidden md:flex absolute -right-3 top-20 w-6 h-6 bg-[#2ea043] rounded-full items-center justify-center text-white border-2 border-[#161b22] hover:scale-110 transition-transform z-50"
      >
        <ChevronRight size={14} className={cn("transition-transform duration-300", !isCollapsed && "rotate-180")} />
      </button>

      {/* Profile Section */}
      <div className={cn("px-4 mb-8 mt-4 transition-all duration-300", isCollapsed ? "px-2" : "px-4")}>
        <div className={cn(
          "flex items-center gap-3 rounded-2xl bg-[#0d1117] border border-[#30363d] transition-all duration-300 shadow-inner overflow-hidden",
          isCollapsed ? "justify-center w-12 h-12 mx-auto" : "p-3 w-full"
        )}>
          <div className="w-9 h-9 rounded-xl bg-[#2ea043] flex items-center justify-center text-white font-black shrink-0 shadow-lg shadow-[#2ea043]/20 transition-transform duration-300 overflow-hidden">
            {user?.profile_image ? (
              <Image src={user.profile_image} alt="Avatar" width={36} height={36} className="w-full h-full object-cover" />
            ) : (
              user?.email?.[0]?.toUpperCase() || '?'
            )}
          </div>
          {!isCollapsed && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="min-w-0 flex-1"
            >
              <p className="text-sm font-bold text-white truncate">{user?.full_name || user?.email?.split('@')[0] || 'Utilisateur'}</p>
              <p className="text-[10px] text-[#2ea043] font-black uppercase tracking-widest">{user?.role_name || 'Rôle'}</p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className={cn("flex-1 overflow-y-auto custom-scrollbar px-3 space-y-6", isCollapsed && "px-2")}>
        {/* ChatGPT Style - New Chat Button */}
        {user?.role_name === 'Student' && (
          <div className="space-y-2">
            <button
              onClick={onNewChat}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 rounded-xl border border-[#30363d] hover:border-[#2ea043] hover:bg-[#21262d] transition-all group",
                isCollapsed ? "justify-center" : ""
              )}
            >
              <PlusCircle size={20} className="text-[#2ea043]" />
              {!isCollapsed && <span className="text-sm font-bold text-white">Nouveau Chat</span>}
            </button>
          </div>
        )}

        {/* Chat History Section */}
        {user?.role_name === 'Student' && chatHistory.length > 0 && (
          <div className="space-y-2">
            {!isCollapsed && (
              <div className="flex items-center justify-between px-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Historique</label>
                <History size={12} className="text-gray-500" />
              </div>
            )}
            <div className="space-y-1">
              {chatHistory.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => onHistoryClick?.(chat.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#21262d] transition-all group text-left",
                    isCollapsed ? "justify-center" : ""
                  )}
                >
                  <MessageCircle size={16} className="shrink-0 group-hover:text-[#2ea043]" />
                  {!isCollapsed && <span className="text-xs font-medium truncate">{chat.title}</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Semester Selection */}
        {(!currentYear || user?.role_name === 'Professor') && (
          <div className="space-y-2">
            {!isCollapsed && <label className="px-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Navigation</label>}
            <div className="space-y-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <button
                  key={num}
                  onClick={() => onSemesterSelect(num)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative",
                    currentSemester === num 
                      ? "bg-[#2ea043]/10 text-[#2ea043] border border-[#2ea043]/20" 
                      : "text-gray-400 hover:text-white hover:bg-[#21262d] border border-transparent"
                  )}
                >
                  <LayoutDashboard size={18} className={cn("shrink-0", currentSemester === num ? "text-[#2ea043]" : "group-hover:text-white")} />
                  {!isCollapsed && <span className="text-sm font-bold">Semestre {num}</span>}
                  {isCollapsed && currentSemester === num && (
                    <div className="absolute left-0 w-1 h-6 bg-[#2ea043] rounded-r-full" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Courses List */}
        <div className="space-y-2">
          {!isCollapsed && <label className="px-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Vos Matières</label>}
          <div className="space-y-1">
            {courses.length > 0 ? (
              courses.map((course) => (
                <button
                  key={course.id}
                  onClick={() => onCourseClick?.(course)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group border border-transparent hover:bg-[#21262d] text-left",
                    isCollapsed ? "justify-center" : ""
                  )}
                >
                  <BookOpen size={18} className="text-gray-500 group-hover:text-[#2ea043] shrink-0" />
                  {!isCollapsed && (
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-300 group-hover:text-white truncate">{course.name}</p>
                      <p className="text-[10px] text-gray-500 truncate">{course.subject_name}</p>
                    </div>
                  )}
                </button>
              ))
            ) : (
              !isCollapsed && <p className="px-3 text-xs text-gray-600 italic">Aucun cours trouvé</p>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[#30363d] space-y-2">
        <button
          onClick={logout}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 transition-all group",
            isCollapsed ? "justify-center" : ""
          )}
        >
          <LogOut size={18} className="shrink-0" />
          {!isCollapsed && <span className="text-sm font-bold">Déconnexion</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside 
        className={cn(
          "hidden md:flex flex-col h-screen transition-all duration-300 ease-in-out shrink-0 z-[100]",
          isCollapsed ? "w-20" : "w-72"
        )}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <motion.aside
        initial={{ x: '-100%' }}
        animate={{ x: isMobileOpen ? 0 : '-100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-y-0 left-0 w-72 z-[100] md:hidden"
      >
        <SidebarContent />
      </motion.aside>

      {/* Mobile Toggle */}
      {!isMobileOpen && (
        <button
          onClick={() => setIsMobileOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-[#2ea043] rounded-full flex items-center justify-center text-white shadow-2xl shadow-[#2ea043]/40 md:hidden z-[80] active:scale-90 transition-transform"
        >
          <Menu size={24} />
        </button>
      )}
    </>
  );
}
