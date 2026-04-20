'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { apiFetch, apiFetchBlob } from '@/services/api';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  FileText, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  BookOpen, 
  Layers,
  ArrowRight,
  Loader2,
  Edit,
  X,
  Search,
  FileUp,
  File as FileIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import PageTransition from '@/components/PageTransition';
import Sidebar from '@/components/Sidebar';
import { Course, Document } from '@/types/types';

import { useAuth } from '@/hooks/AuthContext';
import Image from 'next/image';

const semesterMap: Record<number, { label: string, value: number }[]> = {
  1: [{ label: "S1", value: 1 }, { label: "S2", value: 2 }],
  2: [{ label: "S3", value: 3 }, { label: "S4", value: 4 }],
  3: [{ label: "S5", value: 5 }, { label: "S6", value: 6 }],
  4: [{ label: "S7", value: 7 }, { label: "S8", value: 8 }],
  5: [{ label: "S9", value: 9 }, { label: "S10", value: 10 }],
};

export default function ProfessorDashboard() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [existingDocuments, setExistingDocuments] = useState<Document[]>([]);
  
  // Form State
  const [courseForm, setCourseForm] = useState({
    name: '',
    year: 1,
    semester_id: 1,
    subject_name: '',
    description: ''
  });

  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/courses/?semester_id=${courseForm.semester_id}`);
      setCourses(data);
      if (isEditing && editingId) {
        const currentCourse = data.find((c: Course) => c.id === editingId);
        if (currentCourse) {
          setExistingDocuments(currentCourse.documents || []);
        }
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [courseForm.semester_id, isEditing, editingId]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleSemesterSelect = (id: number) => {
    setCourseForm(prev => ({
      ...prev,
      semester_id: id,
      year: Math.ceil(id / 2)
    }));
  };

  const handleYearChange = (year: number) => {
    const semesters = semesterMap[year];
    setCourseForm({
      ...courseForm,
      year,
      semester_id: semesters[0].value
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).filter(f => 
        ['application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'].includes(f.type)
      );
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateOrUpdate = async () => {
    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('name', courseForm.name);
      formData.append('subject_name', courseForm.subject_name);
      formData.append('semester_id', courseForm.semester_id.toString());
      formData.append('description', courseForm.description);
      
      files.forEach(file => {
        formData.append('files', file);
      });

      if (isEditing && editingId) {
        await apiFetch(`/courses/${editingId}`, {
          method: 'PUT',
          body: formData
        });
        setSuccess('Cours mis à jour avec succès');
      } else {
        await apiFetch('/courses/', {
          method: 'POST',
          body: formData
        });
        setSuccess('Cours publié avec succès');
      }
      
      resetForm();
      fetchCourses();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue';
      setError(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCourse = async (id: number) => {
    if (!confirm('Voulez-vous vraiment supprimer ce cours ?')) return;
    try {
      await apiFetch(`/courses/${id}`, { method: 'DELETE' });
      fetchCourses();
      setSuccess('Cours supprimé');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la suppression';
      setError(errorMessage);
    }
  };

  const handleDeleteDocument = async (docId: number) => {
    try {
      await apiFetch(`/courses/documents/${docId}`, { method: 'DELETE' });
      if (isEditing && editingId) {
        setExistingDocuments(prev => prev.filter(d => d.id !== docId));
      }
      fetchCourses();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la suppression du document';
      setError(errorMessage);
    }
  };

  const startEdit = (course: Course) => {
    setIsEditing(true);
    setEditingId(course.id);
    setCourseForm({
      name: course.name,
      year: Math.ceil(course.semester_id / 2),
      semester_id: course.semester_id,
      subject_name: course.subject_name || '',
      description: course.description || ''
    });
    setExistingDocuments(course.documents || []);
    setStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setCourseForm({
      name: '',
      year: 1,
      semester_id: 1,
      subject_name: '',
      description: ''
    });
    setFiles([]);
    setExistingDocuments([]);
    setStep(1);
    setError('');
    setSuccess('');
  };

  const filteredCourses = courses.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.subject_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ProtectedRoute allowedRoles={['Professor']}>
      <div className="flex h-screen bg-[#0d1117] text-[#c9d1d9] overflow-hidden font-sans selection:bg-[#2ea043]/30">
        <Sidebar 
          onSemesterSelect={handleSemesterSelect} 
          currentSemester={courseForm.semester_id}
          courses={courses}
        />
        
        <main className="flex-1 relative bg-[#0d1117] h-screen overflow-hidden">
          <div className="absolute inset-0 overflow-y-auto custom-scrollbar">
            <PageTransition>
              <div className="p-10 md:p-16 max-w-7xl mx-auto w-full">
                
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
                  <div className="flex items-center gap-8">
                    <div className="w-20 h-20 bg-blue-500/10 rounded-[1.5rem] flex items-center justify-center text-blue-500 shadow-xl overflow-hidden border border-blue-500/20">
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
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 mb-3"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Espace Enseignant</span>
                      </motion.div>
                      <h1 className="text-4xl font-black text-white mb-2 tracking-tight">Bonjour, {user?.full_name || user?.email?.split('@')[0]}</h1>
                      <p className="text-gray-500 text-lg font-medium max-w-xl">Gérez vos cours, publiez du matériel pédagogique et interagissez avec vos étudiants.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="p-1.5 bg-[#161b22] rounded-2xl border border-[#30363d] flex items-center gap-3 shadow-xl focus-within:border-[#2ea043]/50 transition-all">
                      <Search className="ml-4 text-gray-500" size={20} />
                      <input 
                        className="bg-transparent border-none outline-none text-sm py-3 pr-6 text-white placeholder:text-gray-600 w-64 lg:w-80"
                        placeholder="Rechercher vos cours..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {success && (
                    <motion.div 
                      initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                      className="mb-12 flex items-center gap-5 p-6 bg-[#2ea043]/10 border border-[#2ea043]/20 rounded-[2rem] text-[#2ea043] shadow-[0_10px_30px_rgba(46,160,67,0.05)]"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-[#2ea043] flex items-center justify-center text-white shrink-0 shadow-lg shadow-[#2ea043]/20">
                        <CheckCircle2 size={24} />
                      </div>
                      <p className="font-bold text-sm tracking-tight">{success}</p>
                      <button onClick={() => setSuccess('')} className="ml-auto p-2 hover:bg-[#2ea043]/20 rounded-xl transition-colors"><X size={20} /></button>
                    </motion.div>
                  )}
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                      className="mb-12 flex items-center gap-5 p-6 bg-red-500/10 border border-red-500/20 rounded-[2rem] text-red-400 shadow-[0_10px_30px_rgba(239,68,68,0.05)]"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-red-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-red-500/20">
                        <AlertCircle size={24} />
                      </div>
                      <p className="font-bold text-sm tracking-tight">{error}</p>
                      <button onClick={() => setError('')} className="ml-auto p-2 hover:bg-red-500/20 rounded-xl transition-colors"><X size={20} /></button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }} 
                    animate={{ opacity: 1, scale: 1 }}
                    className="lg:col-span-5 bg-[#161b22] border border-[#30363d] p-10 lg:p-14 rounded-[3rem] shadow-2xl h-fit sticky top-10"
                  >
                    <div className="flex items-center justify-between mb-12">
                      <div className="flex items-center gap-5">
                        <div className={cn(
                          "w-16 h-16 rounded-[1.5rem] flex items-center justify-center transition-all duration-700 shadow-xl",
                          isEditing ? "bg-blue-500 text-white shadow-blue-500/20" : "bg-[#2ea043] text-white shadow-[#2ea043]/20"
                        )}>
                          {isEditing ? <Edit size={32} /> : <Plus size={32} />}
                        </div>
                        <div>
                          <h2 className="text-2xl font-black text-white tracking-tight">{isEditing ? "Modifier" : "Créer"}</h2>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Publication de cours</p>
                        </div>
                      </div>
                      {isEditing && (
                        <button onClick={resetForm} className="w-12 h-12 rounded-2xl bg-[#0d1117] border border-[#30363d] flex items-center justify-center text-gray-500 hover:text-white hover:border-white/20 transition-all">
                          <X size={24} />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mb-16">
                      {[1, 2, 3].map((s) => (
                        <div key={s} className="flex-1 space-y-3">
                          <div className={cn(
                            "h-2 rounded-full transition-all duration-700",
                            step >= s ? (isEditing ? "bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]" : "bg-[#2ea043] shadow-[0_0_15px_rgba(46,160,67,0.3)]") : "bg-[#0d1117]"
                          )} />
                          <span className={cn(
                            "text-[9px] font-black uppercase tracking-[0.2em] block text-center transition-colors duration-500",
                            step === s ? "text-white" : "text-gray-600"
                          )}>Étape {s}</span>
                        </div>
                      ))}
                    </div>

                    <form className="space-y-10">
                      <AnimatePresence mode="wait">
                        {step === 1 && (
                          <motion.div 
                            key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                            className="space-y-10"
                          >
                            <div className="space-y-8">
                              <label className="text-[10px] font-black uppercase text-gray-500 tracking-[0.2em] ml-1">Classification Académique</label>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                  <span className="text-[10px] font-bold text-gray-600 ml-1">Année d&apos;étude</span>
                                  <select 
                                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-2xl p-6 outline-none text-sm font-bold text-white focus:border-[#2ea043] transition-all shadow-inner cursor-pointer hover:border-gray-600"
                                    value={courseForm.year}
                                    onChange={(e) => handleYearChange(Number(e.target.value))}
                                  >
                                    {[1,2,3,4,5].map(y => <option key={y} value={y} className="bg-[#161b22]">Année {y}</option>)}
                                  </select>
                                </div>
                                <div className="space-y-4">
                                  <span className="text-[10px] font-bold text-gray-600 ml-1">Semestre</span>
                                  <select 
                                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-2xl p-6 outline-none text-sm font-bold text-white focus:border-[#2ea043] transition-all shadow-inner cursor-pointer hover:border-gray-600"
                                    value={courseForm.semester_id}
                                    onChange={(e) => setCourseForm({...courseForm, semester_id: Number(e.target.value)})}
                                  >
                                    {semesterMap[courseForm.year].map(s => (
                                      <option key={s.value} value={s.value} className="bg-[#161b22]">{s.label}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <label className="text-[10px] font-black uppercase text-gray-500 tracking-[0.2em] ml-1">Nom de la Matière</label>
                              <input 
                                className="w-full bg-[#0d1117] border border-[#30363d] rounded-2xl p-6 outline-none text-sm font-bold text-white focus:border-[#2ea043] transition-all placeholder:text-gray-700 shadow-inner hover:border-gray-600"
                                value={courseForm.subject_name}
                                onChange={(e) => setCourseForm({...courseForm, subject_name: e.target.value})}
                                placeholder="Ex: Intelligence Artificielle..."
                                required
                              />
                            </div>

                            <button 
                              type="button" onClick={() => setStep(2)} disabled={!courseForm.subject_name}
                              className="w-full bg-[#2ea043] hover:bg-[#238636] text-white py-7 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-4 transition-all disabled:opacity-30 shadow-lg shadow-[#2ea043]/20 active:scale-[0.98]"
                            >
                              Suivant <ArrowRight size={20} />
                            </button>
                          </motion.div>
                        )}
                        {step === 2 && (
                          <motion.div 
                            key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                            className="space-y-10"
                          >
                            <div className="space-y-4">
                              <label className="text-[10px] font-black uppercase text-gray-500 tracking-[0.2em] ml-1">Nom du Chapitre / Support</label>
                              <input 
                                className="w-full bg-[#0d1117] border border-[#30363d] rounded-2xl p-6 outline-none text-sm font-bold text-white focus:border-[#2ea043] transition-all placeholder:text-gray-700 shadow-inner hover:border-gray-600"
                                value={courseForm.name}
                                onChange={(e) => setCourseForm({...courseForm, name: e.target.value})}
                                placeholder="Ex: Chapitre 1: Introduction..."
                                required
                              />
                            </div>

                            <div className="space-y-4">
                              <label className="text-[10px] font-black uppercase text-gray-500 tracking-[0.2em] ml-1">Description (Optionnel)</label>
                              <textarea 
                                className="w-full bg-[#0d1117] border border-[#30363d] rounded-2xl p-6 outline-none text-sm font-bold text-white focus:border-[#2ea043] transition-all placeholder:text-gray-700 shadow-inner min-h-[140px] resize-none hover:border-gray-600"
                                value={courseForm.description}
                                onChange={(e) => setCourseForm({...courseForm, description: e.target.value})}
                                placeholder="Brève description du contenu..."
                              />
                            </div>

                            <div className="flex gap-4">
                              <button 
                                type="button" onClick={() => setStep(1)}
                                className="flex-1 bg-[#0d1117] border border-[#30363d] text-gray-500 py-7 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] transition-all hover:text-white hover:border-white/20"
                              >
                                Retour
                              </button>
                              <button 
                                type="button" onClick={() => setStep(3)} disabled={!courseForm.name}
                                className="flex-[2] bg-[#2ea043] hover:bg-[#238636] text-white py-7 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-4 transition-all disabled:opacity-30 shadow-lg shadow-[#2ea043]/20"
                              >
                                Continuer <ArrowRight size={20} />
                              </button>
                            </div>
                          </motion.div>
                        )}
                        {step === 3 && (
                          <motion.div 
                            key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                            className="space-y-10"
                          >
                            <div className="space-y-8">
                              <label className="text-[10px] font-black uppercase text-gray-500 tracking-[0.2em] ml-1">Documents PDF / PPTX</label>
                              
                              {isEditing && existingDocuments.length > 0 && (
                                <div className="space-y-4">
                                  <p className="text-[10px] font-bold text-gray-600 ml-1">Fichiers actuels</p>
                                  {existingDocuments.map(doc => (
                                    <div key={doc.id} className="flex items-center justify-between p-5 bg-[#0d1117] border border-[#30363d] rounded-2xl group/doc">
                                      <div className="flex items-center gap-4 min-w-0">
                                        <FileIcon size={20} className="text-[#2ea043] shrink-0" />
                                        <span className="text-xs font-bold text-white truncate">{doc.file_name}</span>
                                      </div>
                                      <button 
                                        type="button" 
                                        onClick={() => handleDeleteDocument(doc.id)}
                                        className="p-2.5 text-gray-600 hover:text-red-500 transition-colors"
                                      >
                                        <Trash2 size={18} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}

                              <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-[#30363d] hover:border-[#2ea043]/50 hover:bg-[#2ea043]/5 rounded-[2.5rem] p-12 transition-all cursor-pointer group text-center"
                              >
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple className="hidden" accept=".pdf,.pptx" />
                                <div className="w-20 h-20 rounded-2xl bg-[#0d1117] border border-[#30363d] flex items-center justify-center text-[#2ea043] mx-auto mb-8 group-hover:scale-110 transition-transform shadow-inner">
                                  <FileUp size={32} />
                                </div>
                                <p className="text-sm font-bold text-white mb-2">Cliquez pour ajouter des fichiers</p>
                                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">PDF ou PPTX uniquement</p>
                              </div>

                              {files.length > 0 && (
                                <div className="space-y-3">
                                  {files.map((file, i) => (
                                    <motion.div 
                                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                      key={i} className="flex items-center justify-between p-5 bg-[#2ea043]/5 border border-[#2ea043]/20 rounded-2xl"
                                    >
                                      <div className="flex items-center gap-4 min-w-0">
                                        <CheckCircle2 size={18} className="text-[#2ea043] shrink-0" />
                                        <span className="text-xs font-bold text-[#2ea043] truncate">{file.name}</span>
                                      </div>
                                      <button type="button" onClick={() => removeFile(i)} className="text-gray-500 hover:text-red-500 p-2"><X size={18} /></button>
                                    </motion.div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="flex gap-4">
                              <button 
                                type="button" onClick={() => setStep(2)}
                                className="flex-1 bg-[#0d1117] border border-[#30363d] text-gray-500 py-7 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] transition-all hover:text-white hover:border-white/20"
                              >
                                Précédent
                              </button>
                              <button 
                                type="button" onClick={handleCreateOrUpdate} disabled={actionLoading || (!isEditing && files.length === 0)}
                                className="flex-[2] bg-[#2ea043] hover:bg-[#238636] text-white py-7 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-4 transition-all disabled:opacity-30 shadow-lg shadow-[#2ea043]/20"
                              >
                                {actionLoading ? <Loader2 className="animate-spin" size={20} /> : (isEditing ? "Mettre à jour" : "Publier le cours")}
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </form>
                  </motion.div>

                  <div className="lg:col-span-7 space-y-10">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-4">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-[#2ea043]/10 rounded-[1.25rem] flex items-center justify-center text-[#2ea043] shadow-lg shadow-[#2ea043]/5">
                          <Layers size={32} />
                        </div>
                        <div>
                          <h3 className="text-2xl font-black text-white tracking-tight">Vos Enseignements</h3>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600">Gestion des ressources</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="relative w-80">
                          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600" size={20} />
                          <input 
                            className="w-full bg-[#161b22] border border-[#30363d] rounded-2xl pl-14 pr-6 py-4 outline-none focus:border-[#2ea043] text-sm font-medium transition-all shadow-inner"
                            placeholder="Filtrer vos cours..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {loading ? (
                        [1, 2, 3, 4].map(i => (
                          <div key={i} className="glass p-6 rounded-3xl animate-pulse">
                            <div className="h-32" />
                          </div>
                        ))
                      ) : (
                        filteredCourses.map((course, idx) => (
                          <motion.div 
                            key={course.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.05 }}
                            className="glass p-6 rounded-3xl group card-hover relative flex flex-col"
                          >
                            <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => startEdit(course)}
                                className="p-2.5 rounded-xl bg-[#21262d] text-gray-400 hover:text-blue-500 border border-[#30363d] transition-all"
                              >
                                <Edit size={16} />
                              </button>
                              <button 
                                onClick={() => handleDeleteCourse(course.id)}
                                className="p-2.5 rounded-xl bg-[#21262d] text-gray-400 hover:text-red-500 border border-[#30363d] transition-all"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>

                            <div className="flex items-start gap-4 mb-6">
                              <div className="w-12 h-12 bg-[#21262d] rounded-2xl flex items-center justify-center shrink-0 border border-[#30363d] shadow-inner">
                                <BookOpen className="text-[#2ea043]" size={24} />
                              </div>
                              <div className="min-w-0 pr-16">
                                <h3 className="text-lg font-bold text-white truncate group-hover:text-[#2ea043] transition-colors">{course.name}</h3>
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{course.subject_name}</p>
                              </div>
                            </div>

                            <div className="space-y-4 flex-1">
                              <div className="space-y-2">
                                {course.documents?.map((doc: Document) => (
                                  <div key={doc.id} className="flex items-center justify-between p-2 rounded-xl bg-[#0d1117] border border-[#30363d] group/doc">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <FileText size={14} className="text-gray-500 shrink-0" />
                                      <button 
                                        onClick={async () => {
                                          try {
                                            const res = await apiFetchBlob(`/courses/download/${doc.id}`);
                                            const blob = res.blob;
                                            const contentType = res.contentType;
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
                                          } catch (err: unknown) {
                                            console.error('[ProfessorDashboard] Download error:', err);
                                            alert("Erreur lors du téléchargement");
                                          }
                                        }}
                                        className="text-xs font-bold text-gray-400 hover:text-white truncate text-left"
                                      >
                                        {doc.file_name}
                                      </button>
                                    </div>
                                    <button 
                                      onClick={() => handleDeleteDocument(doc.id)}
                                      className="p-1 text-gray-700 hover:text-red-500 transition-colors opacity-0 group-hover/doc:opacity-100"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        ))
                      )}

                      {!loading && filteredCourses.length === 0 && (
                        <div className="col-span-full py-24 flex flex-col items-center justify-center glass rounded-3xl border-dashed border-2 border-[#30363d]">
                          <div className="w-20 h-20 bg-[#161b22] rounded-full flex items-center justify-center mb-6 shadow-2xl">
                            <FileText className="text-gray-700" size={40} />
                          </div>
                          <h3 className="text-xl font-bold text-white mb-2">Aucun cours trouvé</h3>
                          <p className="text-gray-500 max-w-xs text-center text-sm leading-relaxed mb-6">
                            {searchTerm 
                              ? "Aucun cours ne correspond à votre recherche. Essayez d'autres mots-clés."
                              : "Utilisez le formulaire à gauche pour créer votre premier cours ou modifiez vos critères de recherche."}
                          </p>
                          {searchTerm && (
                            <button 
                              onClick={() => setSearchTerm('')}
                              className="text-xs font-black uppercase tracking-widest text-[#2ea043] hover:text-white transition-colors"
                            >
                              Effacer la recherche
                            </button>
                          )}
                        </div>
                      )}
                    </div>
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
