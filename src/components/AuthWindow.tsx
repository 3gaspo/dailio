import React, { useState } from 'react';
import { useApp } from '../providers/AppProvider';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AuthWindow: React.FC = () => {
  const { user, auth, isDevMode } = useApp();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) return null;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        await auth.signUp(email, password);
      } else {
        await auth.signIn(email, password);
      }
      navigate('/today');
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 dark:bg-black/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="w-full max-w-sm max-h-[90vh] overflow-y-auto bg-white dark:bg-[#141414] border border-black/10 dark:border-white/10 rounded-[28px] p-6 shadow-2xl relative text-black dark:text-white"
        >
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-5">
            <img 
              src="/icon.svg" 
              alt="Dailio Logo" 
              className="w-12 h-12 rounded-2xl shadow-md mb-3 object-cover" 
            />
            <h1 className="text-2xl font-black tracking-tight">Dailio</h1>
          </div>

          {/* Dev mode indicator */}
          {isDevMode && (
            <div className="mb-4 p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center">
              <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                ⚡ Dev Mode Active — Enter any credentials to log in
              </p>
            </div>
          )}

          {/* Mode Switcher Tabs */}
          <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-2xl mb-4">
            <button
              type="button"
              onClick={() => { setIsSignUp(false); setError(null); }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                !isSignUp
                  ? 'bg-white dark:bg-black text-black dark:text-white shadow-sm'
                  : 'text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsSignUp(true); setError(null); }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                isSignUp
                  ? 'bg-white dark:bg-black text-black dark:text-white shadow-sm'
                  : 'text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-black/40 dark:text-white/40 ml-1">
                {isDevMode ? 'Email or Username' : 'Email address'}
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/30 dark:text-white/30" size={17} />
                <input
                  type={isDevMode ? "text" : "email"}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl py-3 pl-11 pr-4 outline-none focus:ring-2 ring-black/10 dark:ring-white/10 transition-all font-medium text-xs sm:text-sm"
                  placeholder={isDevMode ? "e.g. alex or alex@example.com" : "name@example.com"}
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-black/40 dark:text-white/40 ml-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/30 dark:text-white/30" size={17} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl py-3 pl-11 pr-11 outline-none focus:ring-2 ring-black/10 dark:ring-white/10 transition-all font-medium text-xs sm:text-sm"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-xs font-medium px-1 pt-0.5">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full py-3.5 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-bold text-xs sm:text-sm shadow-lg active:scale-95 transition-all disabled:opacity-50 mt-1"
            >
              {loading ? 'Authenticating...' : (isSignUp ? 'Create Account & Start' : 'Sign In')}
            </button>
          </form>

          <p className="text-center text-[10px] text-black/40 dark:text-white/40 mt-4">
            By continuing, you agree to track habits responsibly.
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
