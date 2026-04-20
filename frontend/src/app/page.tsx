'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/hooks/AuthContext';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Loader2 } from 'lucide-react';

function LoginContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const searchParams = useSearchParams();
  const { login } = useAuth();

  useEffect(() => {
    console.log('[LoginPage] Component mounted');
    const errorParam = searchParams.get('error');
    if (errorParam === 'session_expired') {
      setError('Session expirée, veuillez vous reconnecter');
    }
    
    // Test API connectivity
    const testApi = async () => {
      try {
        const { apiFetch } = await import('@/services/api');
        const data = await apiFetch('/auth/test');
        console.log('[LoginPage] API Connectivity Test Success:', data);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('[LoginPage] API Connectivity Test Failed:', message);
      }
    };
    testApi();
  }, [searchParams]);

  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[LoginPage] Login button clicked for:', email);
    
    if (!login) {
      console.error('[LoginPage] login function not found in AuthContext');
      setError('Erreur système: service d\'authentification indisponible');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      console.log('[LoginPage] Sending credentials to authService...');
      await login(email, password);
      
      // The redirect is handled inside AuthContext.login()
      console.log('[LoginPage] Login successful, redirecting...');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Email ou mot de passe incorrect';
      console.error('[LoginPage] Login failed:', message);
      setError(message);
      setIsLoading(false); // Only reset loading on error
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0d1117] p-4 text-white font-sans selection:bg-[#2ea043]/30">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-[#161b22] border border-[#30363d] rounded-[2rem] p-10 shadow-2xl relative overflow-hidden"
      >
        {/* Decorative background glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#2ea043]/10 blur-[80px] rounded-full" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-[#2ea043]/5 blur-[80px] rounded-full" />

        <div className="mb-10 text-center relative z-10">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-[#0d1117] rounded-2xl border border-[#30363d] shadow-inner group transition-all hover:border-[#2ea043]/50">
              <img 
                src="/LOGO/image.png" 
                alt="EMSI Logo" 
                className="h-16 w-auto object-contain group-hover:scale-105 transition-transform duration-500"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    const fallback = document.createElement('div');
                    fallback.className = "text-3xl font-black text-[#2ea043]";
                    fallback.innerText = "EMSI";
                    parent.appendChild(fallback);
                  }
                }}
              />
            </div>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white mb-2">EMSI Copilot</h1>
          <p className="text-gray-400 text-sm font-medium">Assistant Académique Intelligent</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-6 relative z-10">
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 ml-1">Email Académique</label>
            <div className="relative group">
              <input
                type="email"
                name="username"
                required
                placeholder="EMSI mail"
                className="block w-full rounded-xl border border-[#30363d] bg-[#0d1117] px-4 py-3.5 text-white placeholder:text-gray-600 focus:border-[#2ea043] focus:ring-1 focus:ring-[#2ea043] focus:outline-none transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 ml-1">Mot de Passe</label>
            <div className="relative group">
              <input
                type="password"
                name="password"
                required
                placeholder="••••••••"
                className="block w-full rounded-xl border border-[#30363d] bg-[#0d1117] px-4 py-3.5 text-white placeholder:text-gray-600 focus:border-[#2ea043] focus:ring-1 focus:ring-[#2ea043] focus:outline-none transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-3 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400"
              >
                <AlertCircle size={18} className="shrink-0" />
                <p className="font-medium">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={isLoading}
            className="relative w-full overflow-hidden rounded-xl bg-[#238636] py-4 text-sm font-bold text-white transition-all hover:bg-[#2ea043] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#238636]/20"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="animate-spin" size={18} />
                <span>Connexion...</span>
              </div>
            ) : (
              "Se Connecter"
            )}
          </button>
        </form>

        <div className="mt-10 text-center border-t border-[#30363d] pt-8 relative z-10">
          <p className="text-xs text-gray-500 font-medium">
            Accès réservé aux étudiants et professeurs de l&apos;EMSI
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#0d1117] text-[#2ea043]">
        <Loader2 className="animate-spin" size={48} />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
