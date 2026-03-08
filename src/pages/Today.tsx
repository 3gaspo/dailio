import React, { useEffect, useState, useMemo } from 'react';
import { useApp } from '../providers/AppProvider';
import { getDailyKey, getWeeklyKey } from '../utils/dateUtils';
import { computePeriodStats, PeriodStats } from '../utils/habitLogic';
import { Habit, PeriodDoc } from '../types';
import { Plus, Trash2, Check, GripVertical, ArrowUpDown, X } from 'lucide-react';
import { Modal } from '../components/Modal';
import { motion, Reorder, AnimatePresence } from 'motion/react';

export const TodayPage: React.FC = () => {
  const { user, data, categories } = useApp();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [dailyDoc, setDailyDoc] = useState<PeriodDoc | null>(null);
  const [weeklyDoc, setWeeklyDoc] = useState<PeriodDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [localDailyHabits, setLocalDailyHabits] = useState<any[]>([]);
  const [localWeeklyHabits, setLocalWeeklyHabits] = useState<any[]>([]);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, name: string, periodicity: 'daily' | 'weekly', isOneOff: boolean } | null>(null);
  const [newName, setNewName] = useState('');
  const [newPeriodicity, setNewPeriodicity] = useState<'daily' | 'weekly'>('daily');
  const [isOneOff, setIsOneOff] = useState(false);
  const [newCategoryId, setNewCategoryId] = useState<string>('');

  const dailyKey = getDailyKey();
  const weeklyKey = getWeeklyKey();

  const fetchData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    const [h, d, w] = await Promise.all([
      data.getHabits(user.uid),
      data.getPeriodDoc(user.uid, 'daily', dailyKey),
      data.getPeriodDoc(user.uid, 'weekly', weeklyKey)
    ]);
    setHabits(h);
    setDailyDoc(d);
    setWeeklyDoc(w);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const dailyStats = useMemo(() => 
    computePeriodStats(dailyKey, 'daily', habits, dailyDoc),
    [dailyKey, habits, dailyDoc]
  );
  
  const weeklyStats = useMemo(() => 
    computePeriodStats(weeklyKey, 'weekly', habits, weeklyDoc),
    [weeklyKey, habits, weeklyDoc]
  );

  // Sync local state with stats when NOT in reorder mode
  useEffect(() => {
    if (!isReorderMode) {
      setLocalDailyHabits(dailyStats.habits);
    }
  }, [dailyStats.habits, isReorderMode]);

  useEffect(() => {
    if (!isReorderMode) {
      setLocalWeeklyHabits(weeklyStats.habits);
    }
  }, [weeklyStats.habits, isReorderMode]);

  const handleToggle = async (id: string, periodicity: 'daily' | 'weekly', current: boolean) => {
    if (!user || isReorderMode) return;
    const key = periodicity === 'daily' ? dailyKey : weeklyKey;
    const doc = periodicity === 'daily' ? dailyDoc : weeklyDoc;
    const stats = periodicity === 'daily' ? dailyStats : weeklyStats;
    
    const newDone = { ...(doc?.done || {}), [id]: !current };
    
    // Auto-reorder: move to bottom if checked
    let newHabitOrder = doc?.habitOrder ? [...doc.habitOrder] : stats.habits.map(h => h.id);
    if (!current) { // becoming checked
      newHabitOrder = newHabitOrder.filter(hid => hid !== id);
      newHabitOrder.push(id);
    }
    
    // Update local state immediately for snappy feel
    const updatedHabits = (periodicity === 'daily' ? localDailyHabits : localWeeklyHabits).map(h => 
      h.id === id ? { ...h, completed: !current } : h
    );
    
    // If checking, move to bottom of local state too
    if (!current) {
      const habit = updatedHabits.find(h => h.id === id);
      if (habit) {
        const filtered = updatedHabits.filter(h => h.id !== id);
        filtered.push(habit);
        if (periodicity === 'daily') setLocalDailyHabits(filtered);
        else setLocalWeeklyHabits(filtered);
      }
    } else {
      if (periodicity === 'daily') setLocalDailyHabits(updatedHabits);
      else setLocalWeeklyHabits(updatedHabits);
    }

    // Optimistic update for the doc
    const updateState = (prev: PeriodDoc | null): PeriodDoc => {
      const base = prev || { done: {}, skippedHabitIds: [], oneOffHabits: [], updatedAt: new Date() };
      return { ...base, done: newDone, habitOrder: newHabitOrder };
    };
    if (periodicity === 'daily') setDailyDoc(updateState);
    else setWeeklyDoc(updateState);

    try {
      await data.updatePeriodDoc(user.uid, periodicity, key, { done: newDone, habitOrder: newHabitOrder });
    } catch (error) {
      console.error("Failed to toggle habit:", error);
      fetchData(); // Rollback
    }
  };

  const handleReorder = async (newOrder: any[], periodicity: 'daily' | 'weekly') => {
    if (!user) return;
    const key = periodicity === 'daily' ? dailyKey : weeklyKey;
    const newHabitOrder = newOrder.map(h => h.id);

    // Update local state immediately for smooth UI
    if (periodicity === 'daily') setLocalDailyHabits(newOrder);
    else setLocalWeeklyHabits(newOrder);

    // Optimistic update for the doc
    const updateState = (prev: PeriodDoc | null): PeriodDoc => {
      const base = prev || { done: {}, skippedHabitIds: [], oneOffHabits: [], updatedAt: new Date() };
      return { ...base, habitOrder: newHabitOrder };
    };
    if (periodicity === 'daily') setDailyDoc(updateState);
    else setWeeklyDoc(updateState);

    await data.updatePeriodDoc(user.uid, periodicity, key, { habitOrder: newHabitOrder });
  };

  const handleDelete = async (id: string, name: string, periodicity: 'daily' | 'weekly', isOneOff: boolean) => {
    if (!user) return;
    
    if (isOneOff) {
      const key = periodicity === 'daily' ? dailyKey : weeklyKey;
      const doc = periodicity === 'daily' ? dailyDoc : weeklyDoc;
      const newOneOffs = (doc?.oneOffHabits || []).filter(h => h.id !== id);
      const newDone = { ...(doc?.done || {}) };
      delete newDone[id];
      
      // Optimistic local update
      if (periodicity === 'daily') {
        setLocalDailyHabits(prev => prev.filter(h => h.id !== id));
      } else {
        setLocalWeeklyHabits(prev => prev.filter(h => h.id !== id));
      }

      await data.updatePeriodDoc(user.uid, periodicity, key, { oneOffHabits: newOneOffs, done: newDone });
      fetchData();
    } else {
      setDeleteConfirm({ id, name, periodicity, isOneOff });
    }
  };

  const confirmDelete = async () => {
    if (!user || !deleteConfirm) return;
    const { id, periodicity } = deleteConfirm;
    const key = periodicity === 'daily' ? dailyKey : weeklyKey;
    
    // Optimistic local update
    if (periodicity === 'daily') {
      setLocalDailyHabits(prev => prev.filter(h => h.id !== id));
    } else {
      setLocalWeeklyHabits(prev => prev.filter(h => h.id !== id));
    }

    await data.setHabitDeletedFromPeriodKey(user.uid, id, key);
    setDeleteConfirm(null);
    fetchData();
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newName.trim()) return;

    if (isOneOff) {
      const key = newPeriodicity === 'daily' ? dailyKey : weeklyKey;
      const doc = newPeriodicity === 'daily' ? dailyDoc : weeklyDoc;
      const newOneOff = { 
        id: Math.random().toString(36).substr(2, 9), 
        name: newName.trim(),
        categoryId: newCategoryId || undefined
      };
      await data.updatePeriodDoc(user.uid, newPeriodicity, key, {
        oneOffHabits: [...(doc?.oneOffHabits || []), newOneOff]
      });
    } else {
      const currentHabits = await data.getHabits(user.uid);
      const maxOrder = currentHabits
        .filter(h => h.periodicity === newPeriodicity)
        .reduce((max, h) => Math.max(max, h.order || 0), -1);
      
      await data.addHabit(user.uid, {
        name: newName.trim(),
        periodicity: newPeriodicity,
        createdAt: new Date(),
        deletedFromPeriodKey: null,
        order: maxOrder + 1,
        categoryId: newCategoryId || undefined
      });
    }

    setNewName('');
    setNewCategoryId('');
    setIsAddModalOpen(false);
    fetchData();
  };

  if (loading) return <div className="flex justify-center pt-20 font-bold text-black/20">Loading...</div>;

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center pt-20 text-center">
        <h1 className="text-2xl font-bold mb-4">Welcome to Dailio</h1>
        <p className="text-black/40 mb-8">Please sign in to start tracking your habits.</p>
        <button 
          onClick={() => window.location.href = '/settings'}
          className="px-8 py-4 bg-black text-white rounded-2xl font-bold shadow-lg"
        >
          Go to Settings
        </button>
      </div>
    );
  }

  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <header className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-2">Today</h1>
        <p className="text-black/40 font-medium">{todayStr}</p>
      </header>

      <section className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-black/30">Daily habits</h2>
          <button
            onClick={() => setIsReorderMode(!isReorderMode)}
            className={cn(
              "p-2 rounded-xl transition-all",
              isReorderMode ? "bg-black text-white" : "text-black/20 hover:text-black hover:bg-black/5"
            )}
            title={isReorderMode ? "Exit reorder mode" : "Reorder habits"}
          >
            {isReorderMode ? <X size={18} /> : <ArrowUpDown size={18} />}
          </button>
        </div>
        <Reorder.Group 
          axis="y" 
          values={localDailyHabits} 
          onReorder={(newOrder) => handleReorder(newOrder, 'daily')} 
          className="space-y-3"
        >
          {localDailyHabits.map(h => (
            <Reorder.Item key={h.id} value={h} dragListener={isReorderMode}>
              <HabitRow 
                habit={h} 
                categories={categories}
                isReorderMode={isReorderMode}
                onToggle={() => handleToggle(h.id, 'daily', h.completed)}
                onDelete={() => handleDelete(h.id, h.name, 'daily', h.isOneOff)}
              />
            </Reorder.Item>
          ))}
          {localDailyHabits.length === 0 && <p className="text-black/20 italic text-sm">No daily habits for today</p>}
        </Reorder.Group>
      </section>

      <section className="mb-12">
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-black/30 mb-6">Weekly habits</h2>
        <Reorder.Group 
          axis="y" 
          values={localWeeklyHabits} 
          onReorder={(newOrder) => handleReorder(newOrder, 'weekly')} 
          className="space-y-3"
        >
          {localWeeklyHabits.map(h => (
            <Reorder.Item key={h.id} value={h} dragListener={isReorderMode}>
              <HabitRow 
                habit={h} 
                categories={categories}
                isReorderMode={isReorderMode}
                onToggle={() => handleToggle(h.id, 'weekly', h.completed)}
                onDelete={() => handleDelete(h.id, h.name, 'weekly', h.isOneOff)}
              />
            </Reorder.Item>
          ))}
          {localWeeklyHabits.length === 0 && <p className="text-black/20 italic text-sm">No weekly habits for this week</p>}
        </Reorder.Group>
      </section>

      <button
        onClick={() => setIsAddModalOpen(true)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-black text-white rounded-full flex items-center justify-center shadow-xl hover:scale-105 transition-transform active:scale-95 z-40"
      >
        <Plus size={28} />
      </button>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add habit">
        <form onSubmit={handleAdd} className="space-y-8">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Name</label>
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="w-full text-xl font-medium border-b-2 border-black/10 focus:border-black outline-none pb-2 transition-colors"
              placeholder="Drink water"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setNewPeriodicity('daily')}
              className={cn(
                "py-4 rounded-2xl font-semibold transition-all",
                newPeriodicity === 'daily' ? "bg-black text-white" : "bg-black/5 text-black/40"
              )}
            >
              Daily
            </button>
            <button
              type="button"
              onClick={() => setNewPeriodicity('weekly')}
              className={cn(
                "py-4 rounded-2xl font-semibold transition-all",
                newPeriodicity === 'weekly' ? "bg-black text-white" : "bg-black/5 text-black/40"
              )}
            >
              Weekly
            </button>
          </div>

          <div className="flex items-center justify-between py-2">
            <span className="font-medium">One-off habit</span>
            <button
              type="button"
              onClick={() => setIsOneOff(!isOneOff)}
              className={cn(
                "w-12 h-6 rounded-full transition-colors relative",
                isOneOff ? "bg-black" : "bg-black/10"
              )}
            >
              <div className={cn(
                "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                isOneOff ? "left-7" : "left-1"
              )} />
            </button>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">Category</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setNewCategoryId('')}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                  newCategoryId === '' ? "bg-black text-white border-black" : "bg-white text-black/40 border-black/5 hover:border-black/20"
                )}
              >
                None
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setNewCategoryId(cat.id)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                    newCategoryId === cat.id ? "bg-black text-white border-black" : "bg-white text-black/40 border-black/5 hover:border-black/20"
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-5 bg-black text-white rounded-2xl font-bold text-lg shadow-lg active:scale-95 transition-transform"
          >
            Confirm
          </button>
        </form>
      </Modal>

      <Modal 
        isOpen={!!deleteConfirm} 
        onClose={() => setDeleteConfirm(null)} 
        title="Delete Habit"
      >
        <div className="space-y-6">
          <p className="text-lg text-black/60">
            Stop recurring habit <span className="font-bold text-black">"{deleteConfirm?.name}"</span> from today onwards?
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={confirmDelete}
              className="w-full py-4 bg-red-500 text-white rounded-2xl font-bold shadow-lg active:scale-95 transition-transform"
            >
              Stop Habit
            </button>
            <button
              onClick={() => setDeleteConfirm(null)}
              className="w-full py-4 bg-black/5 text-black rounded-2xl font-bold active:scale-95 transition-transform"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};

const HabitRow: React.FC<{ 
  habit: any; 
  categories: any[];
  isReorderMode: boolean;
  onToggle: () => void; 
  onDelete: () => void 
}> = ({ habit, categories, isReorderMode, onToggle, onDelete }) => {
  const category = categories.find(c => c.id === habit.categoryId);

  return (
    <div className={cn(
      "flex items-center group bg-white p-1 rounded-2xl transition-all",
      isReorderMode ? "ring-2 ring-black/5" : ""
    )}>
      <div className="flex items-center min-w-[40px] justify-center">
        {isReorderMode ? (
          <div className="p-2 text-black/30 cursor-grab active:cursor-grabbing">
            <GripVertical size={20} />
          </div>
        ) : (
          <button
            onClick={onToggle}
            className={cn(
              "w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all",
              habit.completed 
                ? "bg-black border-black text-white" 
                : "border-black/10 text-transparent hover:border-black/30"
            )}
          >
            <Check size={18} strokeWidth={3} />
          </button>
        )}
      </div>
      <div className="flex-1 ml-4 flex items-center gap-3 overflow-hidden">
        <span className={cn(
          "font-medium text-lg transition-all truncate",
          habit.completed ? "text-black/30 line-through" : "text-black"
        )}>
          {habit.name}
        </span>
        {category && (
          <span className="text-[9px] font-black uppercase tracking-[0.15em] px-2 py-1 bg-black text-white/90 rounded-md whitespace-nowrap shrink-0">
            {category.name}
          </span>
        )}
      </div>
      {!isReorderMode && (
        <button
          onClick={onDelete}
          className="p-2 text-black/10 hover:text-red-500 transition-colors"
        >
          <Trash2 size={20} />
        </button>
      )}
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
