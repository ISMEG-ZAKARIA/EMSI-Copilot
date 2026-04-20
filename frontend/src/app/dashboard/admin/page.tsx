'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/services/api';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { User, AdminAnalytics, Course } from '@/types/types';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  BookOpen, 
  BarChart3, 
  ShieldCheck, 
  UserX, 
  UserCheck,
  Search,
  Activity,
} from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from 'recharts';
import { cn } from '@/lib/utils';
import PageTransition from '@/components/PageTransition';
import Sidebar from '@/components/Sidebar';
import Image from 'next/image';
import { useAuth } from '@/hooks/AuthContext';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedSemester, setSelectedSemester] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersData, analyticsData, coursesData] = await Promise.all([
        apiFetch('/admin/users'),
        apiFetch('/admin/analytics'),
        apiFetch('/courses/')
      ]);
      setUsers(usersData);
      setAnalytics(analyticsData);
      setCourses(coursesData);
    } catch (error: unknown) {
      console.error('[AdminDashboard] Fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSemesterSelect = (semester: number) => {
    setSelectedSemester(semester);
    setActiveTab('courses');
  };

  const filteredCourses = courses.filter(c => 
    !selectedSemester || c.semester_id === selectedSemester
  );

  const toggleUserStatus = async (userId: number, currentStatus: number) => {
    try {
      await apiFetch(`/admin/users/${userId}/status?is_active=${currentStatus === 1 ? 'false' : 'true'}`, {
        method: 'PATCH'
      });
      fetchData();
    } catch (error: unknown) {
      console.error('[AdminDashboard] Toggle status error:', error);
      alert('Erreur lors de la modification');
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ProtectedRoute allowedRoles={['Admin']}>
      <div className="flex h-screen bg-[#0d1117] text-[#c9d1d9] overflow-hidden font-sans selection:bg-[#2ea043]/30">
        <Sidebar onSemesterSelect={handleSemesterSelect} />
        
        <main className="flex-1 relative bg-[#0d1117] h-screen overflow-hidden">
          <div className="absolute inset-0 overflow-y-auto custom-scrollbar">
            <PageTransition>
              <div className="p-10 md:p-16 max-w-7xl mx-auto w-full">
              
              {/* Premium Header */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
                <div className="flex items-center gap-8">
                  <div className="w-20 h-20 bg-purple-500/10 rounded-[1.5rem] flex items-center justify-center text-purple-500 shadow-xl overflow-hidden border border-purple-500/20">
                    {user?.profile_image ? (
                      <Image src={user.profile_image} alt="Avatar" width={80} height={80} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl font-black">{user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}</span>
                    )}
                  </div>
                  <div className="relative">
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 mb-4"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-purple-500">Console Système</span>
                    </motion.div>
                    <h1 className="text-4xl font-black text-white mb-2 tracking-tight">Bonjour, {user?.full_name || user?.email?.split('@')[0]}</h1>
                    <p className="text-gray-500 text-lg font-medium max-w-xl">Supervisez les utilisateurs, analysez l&apos;utilisation de l&apos;IA et gérez les ressources système en temps réel.</p>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
                {loading ? (
                  [1, 2, 3, 4].map(i => (
                    <div key={i} className="bg-[#161b22] p-10 rounded-[2.5rem] border border-[#30363d] animate-pulse">
                      <div className="w-16 h-16 rounded-2xl bg-[#0d1117] mb-6" />
                      <div className="h-4 w-24 bg-[#0d1117] rounded-lg mb-3" />
                      <div className="h-10 w-20 bg-[#0d1117] rounded-lg" />
                    </div>
                  ))
                ) : (
                  <>
                    {[
                      { label: "Utilisateurs", val: analytics?.total_users, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
                      { label: "Étudiants", val: analytics?.active_students, icon: ShieldCheck, color: "text-[#2ea043]", bg: "bg-[#2ea043]/10", border: "border-[#2ea043]/20" },
                      { label: "Cours", val: analytics?.total_courses, icon: BookOpen, color: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/20" },
                      { label: "Requêtes IA", val: analytics?.total_chats, icon: Activity, color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20" }
                    ].map((stat, i) => (
                      <motion.div 
                        key={i} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1, type: 'spring' }}
                        className={cn(
                          "bg-[#161b22] p-10 rounded-[2.5rem] border transition-all duration-500 group relative overflow-hidden shadow-2xl hover:translate-y-[-8px]",
                          "border-[#30363d] hover:border-white/20"
                        )}
                      >
                        <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br", stat.bg)} />
                        <div className="relative z-10">
                          <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500 shadow-xl border", stat.bg, stat.color, stat.border)}>
                            <stat.icon size={32} />
                          </div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-2 group-hover:text-white/60 transition-colors">{stat.label}</p>
                          <h4 className="text-4xl font-black text-white tracking-tight">{stat.val ?? 0}</h4>
                        </div>
                      </motion.div>
                    ))}
                  </>
                )}
              </div>

              {/* Tabs & Content */}
              <div className="bg-[#161b22] rounded-[2.5rem] border border-[#30363d] overflow-hidden shadow-2xl">
                <div className="flex border-b border-[#30363d] overflow-x-auto">
                  {[
                    { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
                    { id: 'users', label: 'Gestion Utilisateurs', icon: Users },
                    { id: 'courses', label: 'Gestion Cours', icon: BookOpen }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "flex items-center gap-3 px-10 py-6 text-xs font-black uppercase tracking-widest transition-all relative whitespace-nowrap",
                        activeTab === tab.id ? "text-[#2ea043]" : "text-gray-500 hover:text-white"
                      )}
                    >
                      <tab.icon size={18} /> {tab.label}
                      {activeTab === tab.id && <motion.div layoutId="admin-tab" className="absolute bottom-0 left-0 right-0 h-1 bg-[#2ea043]" />}
                    </button>
                  ))}
                </div>

                <div className="p-10">
                  <AnimatePresence mode="wait">
                    {activeTab === 'overview' ? (
                      <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <div className="h-[400px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={analytics?.usage_stats || []}>
                              <defs>
                                <linearGradient id="colorQueries" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#2ea043" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#2ea043" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#30363d" vertical={false} />
                              <XAxis dataKey="name" stroke="#8b949e" fontSize={10} tickLine={false} axisLine={false} />
                              <YAxis stroke="#8b949e" fontSize={10} tickLine={false} axisLine={false} />
                              <Tooltip 
                                contentStyle={{ backgroundColor: '#0d1117', borderRadius: '16px', border: '1px solid #30363d', fontSize: '12px' }}
                                itemStyle={{ color: '#2ea043' }}
                              />
                              <Area type="monotone" dataKey="queries" stroke="#2ea043" strokeWidth={3} fillOpacity={1} fill="url(#colorQueries)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </motion.div>
                    ) : activeTab === 'users' ? (
                      <motion.div key="users" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <div className="flex items-center justify-between mb-8">
                          <div className="relative group flex-1 max-w-md">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#2ea043] transition-colors" size={18} />
                            <input 
                              className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl pl-12 pr-4 py-3 outline-none text-sm text-white focus:border-[#2ea043] transition-all"
                              placeholder="Rechercher par email..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="text-left border-b border-[#30363d]">
                                <th className="pb-4 px-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Utilisateur</th>
                                <th className="pb-4 px-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Rôle</th>
                                <th className="pb-4 px-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Statut</th>
                                <th className="pb-4 px-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#30363d]/50">
                              {filteredUsers.map((user, idx) => (
                                <motion.tr 
                                  key={user.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.02 }}
                                  className="group hover:bg-[#0d1117]/50 transition-colors"
                                >
                                  <td className="py-5 px-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-9 h-9 rounded-xl bg-[#2ea043]/10 text-[#2ea043] flex items-center justify-center font-black text-xs overflow-hidden">
                                        {user.profile_image ? (
                                          <Image src={user.profile_image} alt="Avatar" width={36} height={36} className="w-full h-full object-cover" />
                                        ) : (
                                          user.email[0].toUpperCase()
                                        )}
                                      </div>
                                      <span className="text-sm font-bold text-white">{user.email}</span>
                                    </div>
                                  </td>
                                  <td className="py-5 px-4">
                                    <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-[#30363d] text-gray-300">
                                      {user.role_name}
                                    </span>
                                  </td>
                                  <td className="py-5 px-4">
                                    <div className="flex items-center gap-2">
                                      <span className={cn("w-2 h-2 rounded-full", user.is_active ? "bg-[#2ea043]" : "bg-red-500")} />
                                      <span className="text-xs font-medium text-gray-400">{user.is_active ? 'Actif' : 'Inactif'}</span>
                                    </div>
                                  </td>
                                  <td className="py-5 px-4 text-right">
                                    <button 
                                      onClick={() => toggleUserStatus(user.id, user.is_active || 0)}
                                      className={cn(
                                        "p-2 rounded-lg transition-all",
                                        user.is_active ? "text-red-400 hover:bg-red-400/10" : "text-[#2ea043] hover:bg-[#2ea043]/10"
                                      )}
                                    >
                                      {user.is_active ? <UserX size={18} /> : <UserCheck size={18} />}
                                    </button>
                                  </td>
                                </motion.tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div key="courses" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <div className="flex items-center justify-between mb-8">
                          <h3 className="text-xl font-black text-white">
                            {selectedSemester ? `Cours - Semestre ${selectedSemester}` : 'Tous les Cours'}
                          </h3>
                          {selectedSemester && (
                            <button 
                              onClick={() => setSelectedSemester(null)}
                              className="text-xs font-black uppercase tracking-widest text-[#2ea043] hover:underline"
                            >
                              Voir tout
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {filteredCourses.length > 0 ? (
                            filteredCourses.map((course, idx) => (
                              <motion.div 
                                key={course.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="p-6 rounded-[2rem] bg-[#0d1117] border border-[#30363d] hover:border-[#2ea043] transition-all group"
                              >
                                <div className="flex items-start justify-between mb-4">
                                  <div className="w-12 h-12 rounded-2xl bg-[#2ea043]/10 text-[#2ea043] flex items-center justify-center border border-[#2ea043]/20">
                                    <BookOpen size={24} />
                                  </div>
                                  <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-[#30363d] text-gray-400">
                                    S{course.semester_id}
                                  </span>
                                </div>
                                <h4 className="text-lg font-black text-white mb-1 group-hover:text-[#2ea043] transition-colors line-clamp-1">{course.name}</h4>
                                <p className="text-xs text-gray-500 font-medium mb-4">{course.subject_name}</p>
                                <div className="flex items-center gap-4">
                                  <div className="flex -space-x-2">
                                    {[1, 2, 3].map(i => (
                                      <div key={i} className="w-6 h-6 rounded-full border-2 border-[#0d1117] bg-[#161b22] flex items-center justify-center">
                                        <div className="w-full h-full rounded-full bg-gradient-to-br from-gray-700 to-gray-800" />
                                      </div>
                                    ))}
                                  </div>
                                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Matériel disponible</span>
                                </div>
                              </motion.div>
                            ))
                          ) : (
                            <div className="col-span-full py-20 text-center">
                              <p className="text-gray-500 font-medium">Aucun cours trouvé pour ce semestre.</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                  </div>
                </div>
              </PageTransition>
            </div>
          </main>
        </div>
      </ProtectedRoute>
    );
  }
