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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, name: string, periodicity: 'daily' | 'weekly', isOneOff: boolean } | null>(null);
  const [newName, setNewName] = useState('');
  const [newPeriodicity, setNewPeriodicity] = useState<'daily' | 'weekly'>('daily');
  const [isOneOff, setIsOneOff] = useState(false);
  const [isAntiTask, setIsAntiTask] = useState(false);
  const [newCategoryId, setNewCategoryId] = useState<string>('');
  const [newMultiplicity, setNewMultiplicity] = useState(1);

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
    } else {
      // In reorder mode, we show the static order (ignore completion status)
      const staticOrder = [...dailyStats.habits].sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        return a.name.localeCompare(b.name);
      });
      setLocalDailyHabits(staticOrder);
    }
  }, [dailyStats.habits, isReorderMode]);
  
  useEffect(() => {
    if (!isReorderMode) {
      setLocalWeeklyHabits(weeklyStats.habits);
    } else {
      const staticOrder = [...weeklyStats.habits].sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        return a.name.localeCompare(b.name);
      });
      setLocalWeeklyHabits(staticOrder);
    }
  }, [weeklyStats.habits, isReorderMode]);

  const handleToggle = async (id: string, periodicity: 'daily' | 'weekly', current: boolean) => {
    if (!user || isReorderMode) return;
    const key = periodicity === 'daily' ? dailyKey : weeklyKey;
    const doc = periodicity === 'daily' ? dailyDoc : weeklyDoc;
    const stats = periodicity === 'daily' ? dailyStats : weeklyStats;
    
    const newDone = { ...(doc?.done || {}), [id]: !current };
    const newSubDone = { ...(doc?.subDone || {}) };
    
    const habit = stats.habits.find(h => h.id === id);
    if (habit && habit.multiplicity > 1) {
      newSubDone[id] = !current ? habit.multiplicity : 0;
    }

    // Maintain habitOrder: 
    // If checking: move to the very end.
    // If unchecking: move to the end of the unchecked block.
    let currentOrder = doc?.habitOrder ? [...doc.habitOrder] : stats.habits.map(h => h.id);
    
    // Ensure all current habits are in the order list
    const allIds = stats.habits.map(h => h.id);
    allIds.forEach(hid => {
      if (!currentOrder.includes(hid)) currentOrder.push(hid);
    });
    // Remove any stale IDs
    currentOrder = currentOrder.filter(hid => allIds.includes(hid));

    let newHabitOrder: string[] = [];
    if (!current) { // Becoming checked
      newHabitOrder = currentOrder.filter(hid => hid !== id);
      newHabitOrder.push(id);
    } else { // Becoming unchecked
      const uncheckedIds = currentOrder.filter(hid => hid !== id && !newDone[hid]);
      const checkedIds = currentOrder.filter(hid => hid !== id && newDone[hid]);
      newHabitOrder = [...uncheckedIds, id, ...checkedIds];
    }
    
    // Update local state immediately for snappy feel
    const updatedHabits = [...stats.habits].map(h => 
      h.id === id ? { ...h, completed: !current, subDone: !current ? h.multiplicity : 0 } : h
    );
    
    // Sort local habits for immediate feedback
    updatedHabits.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const indexA = newHabitOrder.indexOf(a.id);
      const indexB = newHabitOrder.indexOf(b.id);
      return indexA - indexB;
    });

    if (periodicity === 'daily') setLocalDailyHabits(updatedHabits);
    else setLocalWeeklyHabits(updatedHabits);

    // Optimistic update for the doc
    const updateState = (prev: PeriodDoc | null): PeriodDoc => {
      const base = prev || { done: {}, skippedHabitIds: [], oneOffHabits: [], updatedAt: new Date() };
      return { ...base, done: newDone, subDone: newSubDone, habitOrder: newHabitOrder };
    };
    if (periodicity === 'daily') setDailyDoc(updateState);
    else setWeeklyDoc(updateState);

    try {
      await data.updatePeriodDoc(user.uid, periodicity, key, { done: newDone, subDone: newSubDone, habitOrder: newHabitOrder });
    } catch (error) {
      console.error("Failed to toggle habit:", error);
      fetchData(); // Rollback
    }
  };

  const handleSubToggle = async (id: string, periodicity: 'daily' | 'weekly', subIndex: number) => {
    if (!user || isReorderMode) return;
    const key = periodicity === 'daily' ? dailyKey : weeklyKey;
    const doc = periodicity === 'daily' ? dailyDoc : weeklyDoc;
    const stats = periodicity === 'daily' ? dailyStats : weeklyStats;
    
    const habit = stats.habits.find(h => h.id === id);
    if (!habit || habit.multiplicity <= 1) return;

    const currentSubDone = habit.subDone;
    let newCount = subIndex < currentSubDone ? subIndex : subIndex + 1;
    
    const isNowDone = newCount === habit.multiplicity;
    const wasDone = habit.completed;

    const newDone = { ...(doc?.done || {}), [id]: isNowDone };
    const newSubDone = { ...(doc?.subDone || {}), [id]: newCount };

    // Update local state
    const updatedHabits = [...stats.habits].map(h => 
      h.id === id ? { ...h, completed: isNowDone, subDone: newCount } : h
    );

    // If completion status changed, we might need to reorder
    let newHabitOrder = doc?.habitOrder ? [...doc.habitOrder] : stats.habits.map(h => h.id);
    if (isNowDone !== wasDone) {
      if (isNowDone) {
        newHabitOrder = newHabitOrder.filter(hid => hid !== id);
        newHabitOrder.push(id);
      } else {
        const uncheckedIds = newHabitOrder.filter(hid => hid !== id && !newDone[hid]);
        const checkedIds = newHabitOrder.filter(hid => hid !== id && newDone[hid]);
        newHabitOrder = [...uncheckedIds, id, ...checkedIds];
      }
      
      updatedHabits.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        const indexA = newHabitOrder.indexOf(a.id);
        const indexB = newHabitOrder.indexOf(b.id);
        return indexA - indexB;
      });
    }

    if (periodicity === 'daily') setLocalDailyHabits(updatedHabits);
    else setLocalWeeklyHabits(updatedHabits);

    const updateState = (prev: PeriodDoc | null): PeriodDoc => {
      const base = prev || { done: {}, skippedHabitIds: [], oneOffHabits: [], updatedAt: new Date() };
      return { ...base, done: newDone, subDone: newSubDone, habitOrder: newHabitOrder };
    };
    if (periodicity === 'daily') setDailyDoc(updateState);
    else setWeeklyDoc(updateState);

    try {
      await data.updatePeriodDoc(user.uid, periodicity, key, { done: newDone, subDone: newSubDone, habitOrder: newHabitOrder });
    } catch (error) {
      console.error("Failed to toggle sub-habit:", error);
      fetchData();
    }
  };

  const handleReorder = async (newOrder: any[], periodicity: 'daily' | 'weekly') => {
    if (!user) return;
    const key = periodicity === 'daily' ? dailyKey : weeklyKey;
    const newHabitOrder = newOrder.map(h => h.id);

    // Update local state immediately for smooth UI
    if (periodicity === 'daily') setLocalDailyHabits(newOrder);
    else setLocalWeeklyHabits(newOrder);

    // If in reorder mode, this defines the NEW static order
    if (isReorderMode) {
      await Promise.all(newOrder.map((h, i) => {
        if (!h.isOneOff) {
          return data.updateHabitOrder(user.uid, h.id, i);
        }
        return Promise.resolve();
      }));
    }

    // Optimistic update for the doc
    const updateState = (prev: PeriodDoc | null): PeriodDoc => {
      const base = prev || { done: {}, skippedHabitIds: [], oneOffHabits: [], updatedAt: new Date() };
      return { ...base, habitOrder: newHabitOrder };
    };
    if (periodicity === 'daily') setDailyDoc(updateState);
    else setWeeklyDoc(updateState);

    await data.updatePeriodDoc(user.uid, periodicity, key, { habitOrder: newHabitOrder });
    if (isReorderMode) fetchData(); // Refresh shared state
  };

  const handleDelete = async (id: string, name: string, periodicity: 'daily' | 'weekly', isOneOff: boolean) => {
    if (!user) return;
    
    if (isOneOff) {
      const key = periodicity === 'daily' ? dailyKey : weeklyKey;
      const doc = periodicity === 'daily' ? dailyDoc : weeklyDoc;
      const newOneOffs = (doc?.oneOffHabits || []).filter(h => h.id !== id);
      const newDone = { ...(doc?.done || {}) };
      const newSubDone = { ...(doc?.subDone || {}) };
      delete newDone[id];
      delete newSubDone[id];
      
      // Optimistic local update
      if (periodicity === 'daily') {
        setLocalDailyHabits(prev => prev.filter(h => h.id !== id));
      } else {
        setLocalWeeklyHabits(prev => prev.filter(h => h.id !== id));
      }

      await data.updatePeriodDoc(user.uid, periodicity, key, { oneOffHabits: newOneOffs, done: newDone, subDone: newSubDone });
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
    if (!user || !newName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setAddError(null);

    try {
      if (isOneOff) {
        const key = newPeriodicity === 'daily' ? dailyKey : weeklyKey;
        const doc = newPeriodicity === 'daily' ? dailyDoc : weeklyDoc;
        const stats = newPeriodicity === 'daily' ? dailyStats : weeklyStats;
        const newId = Math.random().toString(36).substr(2, 9);
        const newOneOff: any = { 
          id: newId, 
          name: newName.trim(),
        };
        if (newCategoryId) newOneOff.categoryId = newCategoryId;
        if (newMultiplicity > 1) newOneOff.multiplicity = newMultiplicity;
        if (isAntiTask) newOneOff.isAntiTask = true;
        
        let currentOrder = doc?.habitOrder ? [...doc.habitOrder] : stats.habits.map(h => h.id);
        const uncheckedIds = currentOrder.filter(hid => !doc?.done?.[hid]);
        const checkedIds = currentOrder.filter(hid => doc?.done?.[hid]);
        const newHabitOrder = [...uncheckedIds, newId, ...checkedIds];

        await data.updatePeriodDoc(user.uid, newPeriodicity, key, {
          oneOffHabits: [...(doc?.oneOffHabits || []), newOneOff],
          habitOrder: newHabitOrder
        });
      } else {
        const currentHabits = await data.getHabits(user.uid);
        const maxOrder = currentHabits
          .filter(h => h.periodicity === newPeriodicity)
          .reduce((max, h) => Math.max(max, h.order || 0), -1);
        
        const habitPayload: any = {
          name: newName.trim(),
          periodicity: newPeriodicity,
          createdAt: new Date(),
          deletedFromPeriodKey: null,
          order: maxOrder + 1,
        };
        if (newCategoryId) habitPayload.categoryId = newCategoryId;
        if (newMultiplicity > 1) habitPayload.multiplicity = newMultiplicity;
        if (isAntiTask) habitPayload.isAntiTask = true;

        const newId = await data.addHabit(user.uid, habitPayload);

        const key = newPeriodicity === 'daily' ? dailyKey : weeklyKey;
        const doc = newPeriodicity === 'daily' ? dailyDoc : weeklyDoc;
        const stats = newPeriodicity === 'daily' ? dailyStats : weeklyStats;
        
        let currentOrder = doc?.habitOrder ? [...doc.habitOrder] : stats.habits.map(h => h.id);
        const uncheckedIds = currentOrder.filter(hid => !doc?.done?.[hid]);
        const checkedIds = currentOrder.filter(hid => doc?.done?.[hid]);
        const newHabitOrder = [...uncheckedIds, newId, ...checkedIds];
        
        await data.updatePeriodDoc(user.uid, newPeriodicity, key, { habitOrder: newHabitOrder });
      }

      setNewName('');
      setNewCategoryId('');
      setNewMultiplicity(1);
      setIsAntiTask(false);
      setIsAddModalOpen(false);
      await fetchData();
    } catch (err: any) {
      console.error("Failed to add task:", err);
      setAddError(err.message || "Failed to add task. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center pt-20 font-bold text-black/20 dark:text-white/20">Loading...</div>;

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center pt-20 text-center">
        <h1 className="text-2xl font-bold mb-4 dark:text-white">Welcome to Dailio</h1>
        <p className="text-black/40 dark:text-white/40 mb-8">Please sign in to start tracking your habits.</p>
        <button 
          onClick={() => window.location.href = '/settings'}
          className="px-8 py-4 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-bold shadow-lg"
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
        <h1 className="text-4xl font-bold tracking-tight mb-2 dark:text-white">Today</h1>
        <p className="text-black/40 dark:text-white/40 font-medium">{todayStr}</p>
      </header>

      <section className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-black/30 dark:text-white/30">Daily habits</h2>
          <button
            onClick={() => setIsReorderMode(!isReorderMode)}
            className={cn(
              "p-2 rounded-xl transition-all",
              isReorderMode 
                ? "bg-black dark:bg-white text-white dark:text-black" 
                : "text-black/20 dark:text-white/20 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
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
                onSubToggle={(idx) => handleSubToggle(h.id, 'daily', idx)}
                onDelete={() => handleDelete(h.id, h.name, 'daily', h.isOneOff)}
              />
            </Reorder.Item>
          ))}
          {localDailyHabits.length === 0 && <p className="text-black/20 dark:text-white/20 italic text-sm">No daily habits for today</p>}
        </Reorder.Group>
      </section>

      <section className="mb-12">
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-black/30 dark:text-white/30 mb-6">Weekly habits</h2>
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
                onSubToggle={(idx) => handleSubToggle(h.id, 'weekly', idx)}
                onDelete={() => handleDelete(h.id, h.name, 'weekly', h.isOneOff)}
              />
            </Reorder.Item>
          ))}
          {localWeeklyHabits.length === 0 && <p className="text-black/20 dark:text-white/20 italic text-sm">No weekly habits for this week</p>}
        </Reorder.Group>
      </section>

      <button
        onClick={() => setIsAddModalOpen(true)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center shadow-xl hover:scale-105 transition-transform active:scale-95 z-40"
      >
        <Plus size={28} />
      </button>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add habit">
        <form onSubmit={handleAdd} className="space-y-6">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-black/40 dark:text-white/40">Name</label>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="w-full text-xl font-medium border-b-2 border-black/10 dark:border-white/10 focus:border-black dark:focus:border-white bg-transparent dark:text-white outline-none pb-1 transition-colors"
              placeholder="Drink water"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setNewPeriodicity('daily')}
              className={cn(
                "py-3 rounded-2xl font-semibold transition-all text-sm",
                newPeriodicity === 'daily' 
                  ? "bg-black dark:bg-white text-white dark:text-black" 
                  : "bg-black/5 dark:bg-white/5 text-black/40 dark:text-white/40"
              )}
            >
              Daily
            </button>
            <button
              type="button"
              onClick={() => setNewPeriodicity('weekly')}
              className={cn(
                "py-3 rounded-2xl font-semibold transition-all text-sm",
                newPeriodicity === 'weekly' 
                  ? "bg-black dark:bg-white text-white dark:text-black" 
                  : "bg-black/5 dark:bg-white/5 text-black/40 dark:text-white/40"
              )}
            >
              Weekly
            </button>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="font-medium text-sm dark:text-white">One-off habit</span>
            <button
              type="button"
              onClick={() => setIsOneOff(!isOneOff)}
              className={cn(
                "w-10 h-5 rounded-full transition-colors relative",
                isOneOff ? "bg-black dark:bg-white" : "bg-black/10 dark:bg-white/10"
              )}
            >
              <div className={cn(
                "absolute top-0.5 w-4 h-4 bg-white dark:bg-black rounded-full transition-all",
                isOneOff ? "left-5.5" : "left-0.5"
              )} />
            </button>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="font-medium text-sm dark:text-white">Anti-task</span>
            <button
              type="button"
              onClick={() => setIsAntiTask(!isAntiTask)}
              className={cn(
                "w-10 h-5 rounded-full transition-colors relative",
                isAntiTask ? "bg-black dark:bg-white" : "bg-black/10 dark:bg-white/10"
              )}
            >
              <div className={cn(
                "absolute top-0.5 w-4 h-4 bg-white dark:bg-black rounded-full transition-all",
                isAntiTask ? "left-5.5" : "left-0.5"
              )} />
            </button>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="font-medium text-sm dark:text-white">Multiplicity</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setNewMultiplicity(num)}
                  className={cn(
                    "w-8 h-8 rounded-lg text-xs font-bold transition-all",
                    newMultiplicity === num
                      ? "bg-black dark:bg-white text-white dark:text-black"
                      : "bg-black/5 dark:bg-white/5 text-black/40 dark:text-white/40 hover:bg-black/10 dark:hover:bg-white/10"
                  )}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-black/40 dark:text-white/40">Category</label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setNewCategoryId('')}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border",
                  newCategoryId === '' 
                    ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white" 
                    : "bg-white dark:bg-black text-black/40 dark:text-white/40 border-black/5 dark:border-white/5 hover:border-black/20 dark:hover:border-white/20"
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
                    "px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border",
                    newCategoryId === cat.id 
                      ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white" 
                      : "bg-white dark:bg-black text-black/40 dark:text-white/40 border-black/5 dark:border-white/5 hover:border-black/20 dark:hover:border-white/20"
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {addError && (
            <p className="text-red-500 text-xs font-medium px-1">{addError}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !newName.trim()}
            className="w-full py-4 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-bold text-base shadow-lg active:scale-95 transition-transform mt-2 disabled:opacity-50"
          >
            {isSubmitting ? 'Adding...' : 'Confirm'}
          </button>
        </form>
      </Modal>

      <Modal 
        isOpen={!!deleteConfirm} 
        onClose={() => setDeleteConfirm(null)} 
        title="Delete Habit"
      >
        <div className="space-y-6">
          <p className="text-lg text-black/60 dark:text-white/60">
            Stop recurring habit <span className="font-bold text-black dark:text-white">"{deleteConfirm?.name}"</span> from today onwards?
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
              className="w-full py-4 bg-black/5 dark:bg-white/5 text-black dark:text-white rounded-2xl font-bold active:scale-95 transition-transform"
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
  onSubToggle: (idx: number) => void;
  onDelete: () => void 
}> = ({ habit, categories, isReorderMode, onToggle, onSubToggle, onDelete }) => {
  const category = categories.find(c => c.id === habit.categoryId);

  return (
    <div className={cn(
      "flex flex-col bg-white dark:bg-white/5 p-1 rounded-2xl transition-all",
      isReorderMode ? "ring-2 ring-black/5 dark:ring-white/5" : ""
    )}>
      <div className="flex items-center">
        <div className="flex items-center min-w-[40px] justify-center">
          {isReorderMode ? (
            <div className="p-2 text-black/30 dark:text-white/30 cursor-grab active:cursor-grabbing">
              <GripVertical size={20} />
            </div>
          ) : (
            <button
              onClick={onToggle}
              className={cn(
                "w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all",
                habit.completed 
                  ? "bg-black dark:bg-white border-black dark:border-white text-white dark:text-black" 
                  : "border-black/10 dark:border-white/10 text-transparent hover:border-black/30 dark:hover:border-white/30"
              )}
            >
              <Check size={18} strokeWidth={3} className={cn(habit.isAntiTask && !habit.completed && "rotate-45")} />
            </button>
          )}
        </div>
        <div className="flex-1 ml-4 flex items-center gap-3 overflow-hidden">
          <div className="flex flex-col min-w-0">
            <span className={cn(
              "font-medium text-lg transition-all truncate",
              habit.completed ? "text-black/30 dark:text-white/30 line-through" : "text-black dark:text-white"
            )}>
              {habit.name}
            </span>
            {habit.isAntiTask && (
              <span className="text-[9px] font-bold uppercase tracking-wider text-red-500/60 dark:text-red-400/60">
                Anti-task
              </span>
            )}
          </div>
          {category && (
            <span className="text-[9px] font-black uppercase tracking-[0.15em] px-2 py-1 bg-black dark:bg-white text-white/90 dark:text-black/90 rounded-md whitespace-nowrap shrink-0">
              {category.name}
            </span>
          )}
        </div>
        {!isReorderMode && (
          <button
            onClick={onDelete}
            className="p-2 text-black/10 dark:text-white/10 hover:text-red-500 transition-colors"
          >
            <Trash2 size={20} />
          </button>
        )}
      </div>
      
      {habit.multiplicity > 1 && !isReorderMode && (
        <div className="flex gap-1.5 ml-[40px] mb-2 mt-1">
          {Array.from({ length: habit.multiplicity }).map((_, idx) => (
            <button
              key={idx}
              onClick={() => onSubToggle(idx)}
              className={cn(
                "w-4 h-4 rounded-md border transition-all flex items-center justify-center",
                idx < habit.subDone
                  ? "bg-black/40 dark:bg-white/40 border-transparent text-white dark:text-black"
                  : "border-black/10 dark:border-white/10 text-transparent"
              )}
            >
              <Check size={10} strokeWidth={4} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
