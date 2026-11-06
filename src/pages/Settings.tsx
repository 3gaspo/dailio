import { ActionButton } from '@3gaspo/app-ui/ActionButton';
import { formatPercent } from '@3gaspo/app-ui/formats';
import { ValidatedForm } from '../components/ValidatedForm';
import { SettingsSwitch } from '../components/SettingsSwitch';
import { PageHeader } from '../components/PageHeader';
import { DialogActions } from '../components/Dialog';
import React, { useState } from 'react';
import { useApp } from '../providers/AppProvider';
import { motion } from 'motion/react';
import { LogOut, Download, RotateCcw, User, Mail, Lock, Eye, EyeOff, Trash2, History, Heart, Palette } from 'lucide-react';
import { getDailyKey, getWeeklyKey } from '../utils/dateUtils';
import { computePeriodStats } from '../utils/habitLogic';
import { startOfYear, eachDayOfInterval } from 'date-fns';
import { Modal } from '../components/Modal';
import { ResetOption } from '../types';
import { getCategoryColor, getContrastColor, getCategoryDefaultColor } from '../utils/categoryUtils';
import { CategoryColorPicker } from '../components/CategoryColorPicker';
import pkg from '../../package.json';

export const SettingsPage: React.FC = () => {
  const { auth, data, user, isDevMode, categories, refreshCategories, settings, updateSettings, settingsError } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState<string | undefined>();

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
      const color = newCategoryColor || getCategoryDefaultColor(newCategoryName.trim());
      await data.addCategory(user.uid, newCategoryName.trim(), color);
      setNewCategoryName('');
      setNewCategoryColor(undefined);
      await refreshCategories();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCategoryColor = async (id: string, color: string) => {
    if (!user) return;
    try {
      await data.updateCategory(user.uid, id, { color });
      await refreshCategories();
    } catch (err: any) {
      setError(err.message);
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
      setIsResetModalOpen(false);
      window.location.reload();
    } finally {
      setLoading(false);
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

  if (!user) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader title="Settings" devMode={isDevMode} />
      {settingsError && <p role="alert" className="ui-error text-red-600 text-sm mb-4">{settingsError}</p>}

      <div className="space-y-4">
        <section className="ui-section-card bg-ui-section p-8 rounded-[32px] mb-8">
            <h2 className="ui-section-title text-xs font-bold uppercase tracking-[0.2em] text-ui-ink/30 mb-6">Appearance</h2>
            <div className="ui-setting-row ui-item-card flex items-center justify-between bg-ui-surface p-4 rounded-2xl shadow-sm">
              <span className="font-bold dark:text-white">Dark Mode</span>
              <SettingsSwitch checked={settings.theme === 'dark'} onClick={() => updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })} label="Dark Mode" />
            </div>
          </section>

          <section className="ui-section-card bg-ui-section p-8 rounded-[32px] mb-8">
            <h2 className="ui-section-title text-xs font-bold uppercase tracking-[0.2em] text-ui-ink/30 mb-6">Objectives</h2>
            <div className="space-y-6">
              <div className="ui-setting-slider space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-bold dark:text-white">Daily Objective</span>
                  <span className="text-xl font-black dark:text-white">{formatPercent(localDailyObj)}</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.05" 
                  aria-label="Daily Objective"
                  value={localDailyObj}
                  onChange={(e) => setLocalDailyObj(parseFloat(e.target.value))}
                  onKeyUp={(e) => { if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key)) handleUpdateObjective('daily', parseFloat(e.currentTarget.value)); }}
                  onMouseUp={(e) => handleUpdateObjective('daily', parseFloat((e.target as HTMLInputElement).value))}
                  onTouchEnd={(e) => handleUpdateObjective('daily', parseFloat((e.target as HTMLInputElement).value))}
                  className="w-full h-2 bg-ui-ink/10 rounded-lg appearance-none cursor-pointer accent-black dark:accent-white"
                />
              </div>

              <div className="ui-setting-slider space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-bold dark:text-white">Weekly Objective</span>
                  <span className="text-xl font-black dark:text-white">{formatPercent(localWeeklyObj)}</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.05" 
                  aria-label="Weekly Objective"
                  value={localWeeklyObj}
                  onChange={(e) => setLocalWeeklyObj(parseFloat(e.target.value))}
                  onKeyUp={(e) => { if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key)) handleUpdateObjective('weekly', parseFloat(e.currentTarget.value)); }}
                  onMouseUp={(e) => handleUpdateObjective('weekly', parseFloat((e.target as HTMLInputElement).value))}
                  onTouchEnd={(e) => handleUpdateObjective('weekly', parseFloat((e.target as HTMLInputElement).value))}
                  className="w-full h-2 bg-ui-ink/10 rounded-lg appearance-none cursor-pointer accent-black dark:accent-white"
                />
              </div>
            </div>
          </section>

          <section className="ui-section-card bg-ui-section p-8 rounded-[32px] mb-8">
            <h2 className="ui-section-title text-xs font-bold uppercase tracking-[0.2em] text-ui-ink/30 mb-6">Categories</h2>
            <div className="space-y-4 mb-6">
              {categories.map(cat => {
                const currentColor = getCategoryColor(cat);
                const textColor = getContrastColor(currentColor);

                return (
                  <div key={cat.id} className="ui-item-card bg-ui-surface p-4 rounded-2xl shadow-xs space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <span 
                        className="min-w-0 truncate text-xs font-black uppercase tracking-[0.15em] px-3 py-1.5 rounded-lg shadow-xs transition-colors"
                        style={{ backgroundColor: currentColor, color: textColor }}
                      >
                        {cat.name}
                      </span>

                      <div className="flex items-center gap-2 shrink-0">
                        <CategoryColorPicker size="sm" color={currentColor} label={`Color for ${cat.name}`} onChange={color => handleUpdateCategoryColor(cat.id, color)} />
                        <span className="ui-section-title text-[11px] font-mono font-bold text-ui-ink/40 uppercase">
                          {currentColor}
                        </span>
                        <button 
                          type="button"
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="ui-icon-button p-1.5 text-ui-ink/20 hover:text-red-500 transition-colors rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                          title="Delete category"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {categories.length === 0 && (
                <p className="ui-meta text-ui-ink/30 text-sm italic">No categories created yet.</p>
              )}
            </div>

            <ValidatedForm onSubmit={handleAddCategory} className="space-y-3">
              <div className="ui-meta text-[10px] font-bold uppercase tracking-widest text-ui-ink/40 ml-1">
                Add new category
              </div>

              <div className="flex items-center gap-2">
                <CategoryColorPicker size="sm" color={newCategoryColor || getCategoryDefaultColor(newCategoryName.trim())} label="New category color" onChange={setNewCategoryColor} />
                <input 
                  type="text"
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  placeholder="New category name..."
                  className="ui-field flex-1 min-w-0 bg-ui-surface rounded-xl px-4 py-3 outline-none focus:ring-2 ring-ui-ink/5 font-medium text-sm dark:text-white shadow-xs"
                />
                <button 
                  type="submit"
                  disabled={loading || !newCategoryName.trim()}
                  className="ui-button ui-button-primary bg-ui-primary text-ui-primary-text px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-xs hover:opacity-90 disabled:opacity-40 shrink-0"
                >
                  Add
                </button>
              </div>
            </ValidatedForm>
          </section>

          <div className="ui-section-card bg-ui-section p-8 rounded-[32px] mb-8">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 bg-ui-primary rounded-full flex items-center justify-center text-ui-primary-text">
                <User size={24} />
              </div>
              <div>
                <p className="ui-meta text-[10px] font-bold uppercase tracking-widest text-ui-ink/30">Account</p>
                <p className="font-bold dark:text-white">{user.email}</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => auth.signOut()}
            className="ui-setting-action w-full flex items-center justify-between p-6 bg-ui-section rounded-[24px] hover:bg-black/10 dark:hover:bg-white/10 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-ui-surface rounded-xl text-ui-ink transition-transform">
                <LogOut size={20} />
              </div>
              <span className="font-bold dark:text-white">Disconnect / Sign out</span>
            </div>
          </button>

          <button
            onClick={handleExport}
            disabled={loading}
            className="ui-setting-action w-full flex items-center justify-between p-6 bg-ui-section rounded-[24px] hover:bg-black/10 dark:hover:bg-white/10 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-ui-surface rounded-xl text-ui-ink transition-transform">
                <Download size={20} />
              </div>
              <span className="font-bold dark:text-white">Download data as CSV</span>
            </div>
          </button>

          <button
            onClick={() => setIsResetModalOpen(true)}
            className="ui-setting-action w-full flex items-center justify-between p-6 bg-red-500/10 rounded-[24px] hover:bg-red-500 text-red-600 hover:text-white transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-ui-surface rounded-xl text-red-600 transition-transform">
                <RotateCcw size={20} />
              </div>
              <span className="font-bold">Reset data</span>
            </div>
          </button>
        </div>

      <Modal 
        isOpen={isResetModalOpen} 
        onClose={() => setIsResetModalOpen(false)} 
        title="Reset data"
        busy={loading}
      >
        <div className="space-y-4">
          <DialogActions>
            <ActionButton scope="dailio-reset" busyLabel="Resetting…"
              onClick={() => handleReset('history')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 p-5 bg-black/5 rounded-2xl hover:bg-black hover:text-white transition-all group font-bold"
            >
              <History size={20} />
              <span>Clear History</span>
            </ActionButton>

            <ActionButton scope="dailio-reset" busyLabel="Resetting…"
              onClick={() => handleReset('all')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 p-5 bg-red-500/10 rounded-2xl hover:bg-red-500 hover:text-white transition-all group font-bold text-red-600"
            >
              <Trash2 size={20} />
              <span>Reset All</span>
            </ActionButton>

            <ActionButton scope="dailio-reset"
              onClick={() => setIsResetModalOpen(false)}
              className="w-full py-4 text-sm font-bold text-ui-ink/40 hover:text-black dark:hover:text-white transition-colors"
            >
              Cancel
            </ActionButton>
          </DialogActions>
        </div>
      </Modal>

      <footer className="mt-20 pt-12 border-t border-ui-border flex flex-col items-center gap-3">
        <div className="flex flex-col items-center gap-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ui-ink/70">
            Dailio: version {pkg.version}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ui-ink/70 mt-1">
            Gaspard Berthelier
          </p>
          <p className="text-[10px] font-bold tracking-[0.1em] text-ui-ink/70">
            gberthelier.projet@gmail.com
          </p>
        </div>
        
        <img 
          src="/gaspo_logo.svg"
          alt="Gaspo Logo"
          className="w-40 h-40 opacity-100 transition-all duration-700 -my-4" 
          referrerPolicy="no-referrer"
        />

        <a 
          href="https://ko-fi.com/3gaspo" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 bg-ui-primary text-ui-primary-text rounded-full text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg"
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
