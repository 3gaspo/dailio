import React, { useState } from 'react';
import { useApp } from '../providers/AppProvider';
import { motion } from 'motion/react';
import { LogOut, Download, RotateCcw, User, Mail, Lock, Eye, EyeOff, Trash2, History, Heart } from 'lucide-react';
import { getDailyKey, getWeeklyKey } from '../utils/dateUtils';
import { computePeriodStats } from '../utils/habitLogic';
import { startOfYear, eachDayOfInterval } from 'date-fns';
import { Modal } from '../components/Modal';
import { ResetOption } from '../types';
import pkg from '../../package.json';

export const SettingsPage: React.FC = () => {
  const { auth, data, user, isDevMode, categories, refreshCategories, settings, updateSettings } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [localDailyObj, setLocalDailyObj] = useState(settings.dailyObjective);
  const [localWeeklyObj, setLocalWeeklyObj] = useState(settings.weeklyObjective);

  React.useEffect(() => {
    setLocalDailyObj(settings.dailyObjective);
    setLocalWeeklyObj(settings.weeklyObjective);
  }, [settings.dailyObjective, settings.weeklyObjective]);

  const handleUpdateObjective = async (type: 'daily' | 'weekly', value: number) => {
    if (type === 'daily') {
      setLocalDailyObj(value);
      await updateSettings({ dailyObjective: value });
    } else {
      setLocalWeeklyObj(value);
      await updateSettings({ weeklyObjective: value });
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newCategoryName.trim()) return;
    setLoading(true);
    try {
      await data.addCategory(user.uid, newCategoryName.trim());
      setNewCategoryName('');
      await refreshCategories();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!user) return;
    setLoading(true);
    try {
      await data.deleteCategory(user.uid, id);
      await refreshCategories();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isSignUp) {
        await auth.signUp(email, password);
      } else {
        await auth.signIn(email, password);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (option: ResetOption) => {
    if (!user) return;
    setLoading(true);
    try {
      await data.resetData(user.uid, option);
      window.location.reload();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setIsResetModalOpen(false);
    }
  };

  const handleExport = async () => {
    if (!user) return;
    setLoading(true);
    
    const habits = await data.getHabits(user.uid);
    const start = startOfYear(new Date());
    const end = new Date();
    const days = eachDayOfInterval({ start, end });
    
    const rows = [['date', 'to_do_dailies', 'to_do_weeklies', 'done_dailies', 'done_weeklies']];
    
    for (const d of days) {
      const dKey = getDailyKey(d);
      const wKey = getWeeklyKey(d);
      
      const dDoc = await data.getPeriodDoc(user.uid, 'daily', dKey);
      const wDoc = await data.getPeriodDoc(user.uid, 'weekly', wKey);
      
      const dStats = computePeriodStats(dKey, 'daily', habits, dDoc);
      const wStats = computePeriodStats(wKey, 'weekly', habits, wDoc);
      
      rows.push([
        dKey,
        dStats.to_do.toString(),
        wStats.to_do.toString(),
        dStats.done.toString(),
        wStats.done.toString()
      ]);
    }
    
    const csvContent = rows.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `dailio_export_${getDailyKey()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setLoading(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <header className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-2">Settings</h1>
        {isDevMode && <p className="text-emerald-500 text-[10px] font-bold uppercase tracking-widest">Dev mode</p>}
      </header>

      {!user ? (
        <section className="bg-black/5 p-8 rounded-[32px]">
          <h2 className="text-xl font-bold mb-8">{isSignUp ? 'Create account' : 'Sign in'}</h2>
          <form onSubmit={handleAuth} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-black/30 ml-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20" size={20} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-white rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 ring-black/10 transition-all font-medium"
                  placeholder="name@example.com"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-black/30 ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20" size={20} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-white rounded-2xl py-4 pl-12 pr-12 outline-none focus:ring-2 ring-black/10 transition-all font-medium"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-black/20 hover:text-black transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            {error && <p className="text-red-500 text-xs font-medium px-1">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-black text-white rounded-2xl font-bold text-lg shadow-lg active:scale-95 transition-transform disabled:opacity-50"
            >
              {loading ? 'Processing...' : (isSignUp ? 'Sign up' : 'Sign in')}
            </button>
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="w-full text-sm font-bold text-black/40 hover:text-black transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign in' : 'New here? Create an account'}
            </button>
          </form>
        </section>
      ) : (
        <div className="space-y-4">
          <section className="bg-black/5 p-8 rounded-[32px] mb-8">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-black/30 mb-6">Objectives</h2>
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-bold">Daily Objective</span>
                  <span className="text-xl font-black">{Math.round(localDailyObj * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.05" 
                  value={localDailyObj}
                  onChange={(e) => setLocalDailyObj(parseFloat(e.target.value))}
                  onMouseUp={(e) => handleUpdateObjective('daily', parseFloat((e.target as HTMLInputElement).value))}
                  onTouchEnd={(e) => handleUpdateObjective('daily', parseFloat((e.target as HTMLInputElement).value))}
                  className="w-full h-2 bg-black/10 rounded-lg appearance-none cursor-pointer accent-black"
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-bold">Weekly Objective</span>
                  <span className="text-xl font-black">{Math.round(localWeeklyObj * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.05" 
                  value={localWeeklyObj}
                  onChange={(e) => setLocalWeeklyObj(parseFloat(e.target.value))}
                  onMouseUp={(e) => handleUpdateObjective('weekly', parseFloat((e.target as HTMLInputElement).value))}
                  onTouchEnd={(e) => handleUpdateObjective('weekly', parseFloat((e.target as HTMLInputElement).value))}
                  className="w-full h-2 bg-black/10 rounded-lg appearance-none cursor-pointer accent-black"
                />
              </div>
            </div>
          </section>

          <section className="bg-black/5 p-8 rounded-[32px] mb-8">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-black/30 mb-6">Categories</h2>
            <div className="space-y-3 mb-6">
              {categories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm">
                  <span className="font-bold">{cat.name}</span>
                  <button 
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="p-2 text-black/10 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
            <form onSubmit={handleAddCategory} className="flex gap-2">
              <input 
                type="text"
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                placeholder="New category..."
                className="flex-1 bg-white rounded-xl px-4 py-3 outline-none focus:ring-2 ring-black/5 font-medium text-sm"
              />
              <button 
                type="submit"
                disabled={loading || !newCategoryName.trim()}
                className="bg-black text-white px-6 rounded-xl font-bold text-sm active:scale-95 transition-transform disabled:opacity-50"
              >
                Add
              </button>
            </form>
          </section>

          <div className="bg-black/5 p-8 rounded-[32px] mb-8">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center text-white">
                <User size={24} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-black/30">Account</p>
                <p className="font-bold">{user.email}</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => auth.signOut()}
            className="w-full flex items-center justify-between p-6 bg-black/5 rounded-[24px] hover:bg-black/10 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white rounded-xl text-black group-hover:scale-110 transition-transform">
                <LogOut size={20} />
              </div>
              <span className="font-bold">Disconnect / Sign out</span>
            </div>
          </button>

          <button
            onClick={handleExport}
            disabled={loading}
            className="w-full flex items-center justify-between p-6 bg-black/5 rounded-[24px] hover:bg-black/10 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white rounded-xl text-black group-hover:scale-110 transition-transform">
                <Download size={20} />
              </div>
              <span className="font-bold">Download data as CSV</span>
            </div>
          </button>

          <button
            onClick={() => setIsResetModalOpen(true)}
            className="w-full flex items-center justify-between p-6 bg-red-500/10 rounded-[24px] hover:bg-red-500 text-red-600 hover:text-white transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white rounded-xl text-red-600 group-hover:scale-110 transition-transform">
                <RotateCcw size={20} />
              </div>
              <span className="font-bold">Reset data</span>
            </div>
          </button>
        </div>
      )}

      <Modal 
        isOpen={isResetModalOpen} 
        onClose={() => setIsResetModalOpen(false)} 
        title="Reset Data"
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-3">
            <button
              onClick={() => handleReset('history')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 p-5 bg-black/5 rounded-2xl hover:bg-black hover:text-white transition-all group font-bold"
            >
              <History size={20} />
              <span>Clear History</span>
            </button>

            <button
              onClick={() => handleReset('all')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 p-5 bg-red-500/10 rounded-2xl hover:bg-red-500 hover:text-white transition-all group font-bold text-red-600"
            >
              <Trash2 size={20} />
              <span>Reset All</span>
            </button>

            <button
              onClick={() => setIsResetModalOpen(false)}
              className="w-full py-4 text-sm font-bold text-black/40 hover:text-black transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      <footer className="mt-20 pt-12 border-t border-black/5 flex flex-col items-center gap-3">
        <div className="flex flex-col items-center gap-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/20">
            Dailio: version {pkg.version}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/20 mt-1">
            Gaspard Berthelier
          </p>
          <p className="text-[10px] font-bold tracking-[0.1em] text-black/20">
            gberthelier.projet@gmail.com
          </p>
        </div>
        
        <img 
          src="/sakura.svg" 
          alt="Sakura" 
          className="w-40 h-40 opacity-30 grayscale hover:grayscale-0 transition-all duration-700 -my-4" 
          referrerPolicy="no-referrer"
        />

        <a 
          href="https://ko-fi.com/3gaspo" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-full text-[10px] font-bold uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg"
        >
          <Heart size={14} fill="currentColor" />
          Support the project
        </a>
      </footer>
    </motion.div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
