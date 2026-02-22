import React, { useEffect, useState } from 'react';
import { useApp } from '../providers/AppProvider';
import { getDailyKey, getWeeklyKey } from '../utils/dateUtils';
import { computePeriodStats, PeriodStats } from '../utils/habitLogic';
import { Habit, PeriodDoc } from '../types';
import { Plus, Trash2, Check } from 'lucide-react';
import { Modal } from '../components/Modal';
import { motion } from 'motion/react';

export const TodayPage: React.FC = () => {
  const { user, data } = useApp();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [dailyDoc, setDailyDoc] = useState<PeriodDoc | null>(null);
  const [weeklyDoc, setWeeklyDoc] = useState<PeriodDoc | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPeriodicity, setNewPeriodicity] = useState<'daily' | 'weekly'>('daily');
  const [isOneOff, setIsOneOff] = useState(false);

  const dailyKey = getDailyKey();
  const weeklyKey = getWeeklyKey();

  const fetchData = async () => {
    if (!user) return;
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

  const dailyStats = computePeriodStats(dailyKey, 'daily', habits, dailyDoc);
  const weeklyStats = computePeriodStats(weeklyKey, 'weekly', habits, weeklyDoc);

  const handleToggle = async (id: string, periodicity: 'daily' | 'weekly', current: boolean) => {
    if (!user) return;
    const key = periodicity === 'daily' ? dailyKey : weeklyKey;
    const doc = periodicity === 'daily' ? dailyDoc : weeklyDoc;
    
    const newDone = { ...(doc?.done || {}), [id]: !current };
    await data.updatePeriodDoc(user.uid, periodicity, key, { done: newDone });
    fetchData();
  };

  const handleDelete = async (id: string, name: string, periodicity: 'daily' | 'weekly', isOneOff: boolean) => {
    if (!user) return;
    if (isOneOff) {
      const key = periodicity === 'daily' ? dailyKey : weeklyKey;
      const doc = periodicity === 'daily' ? dailyDoc : weeklyDoc;
      const newOneOffs = (doc?.oneOffHabits || []).filter(h => h.id !== id);
      const newDone = { ...(doc?.done || {}) };
      delete newDone[id];
      await data.updatePeriodDoc(user.uid, periodicity, key, { oneOffHabits: newOneOffs, done: newDone });
    } else {
      if (confirm(`Stop recurring habit "${name}" from today onwards?`)) {
        const key = periodicity === 'daily' ? dailyKey : weeklyKey;
        await data.setHabitDeletedFromPeriodKey(user.uid, id, key);
      }
    }
    fetchData();
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newName.trim()) return;

    if (isOneOff) {
      const key = newPeriodicity === 'daily' ? dailyKey : weeklyKey;
      const doc = newPeriodicity === 'daily' ? dailyDoc : weeklyDoc;
      const newOneOff = { id: Math.random().toString(36).substr(2, 9), name: newName.trim() };
      await data.updatePeriodDoc(user.uid, newPeriodicity, key, {
        oneOffHabits: [...(doc?.oneOffHabits || []), newOneOff]
      });
    } else {
      await data.addHabit(user.uid, {
        name: newName.trim(),
        periodicity: newPeriodicity,
        createdAt: new Date(),
        deletedFromPeriodKey: null
      });
    }

    setNewName('');
    setIsAddModalOpen(false);
    fetchData();
  };

  if (loading) return <div className="flex justify-center pt-20">Loading...</div>;

  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <header className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-2">Today</h1>
        <p className="text-black/40 font-medium">{todayStr}</p>
      </header>

      <section className="mb-12">
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-black/30 mb-6">Daily habits</h2>
        <div className="space-y-3">
          {dailyStats.habits.map(h => (
            <HabitRow 
              key={h.id} 
              habit={h} 
              onToggle={() => handleToggle(h.id, 'daily', h.completed)}
              onDelete={() => handleDelete(h.id, h.name, 'daily', h.isOneOff)}
            />
          ))}
          {dailyStats.habits.length === 0 && <p className="text-black/20 italic text-sm">No daily habits for today</p>}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-black/30 mb-6">Weekly habits</h2>
        <div className="space-y-3">
          {weeklyStats.habits.map(h => (
            <HabitRow 
              key={h.id} 
              habit={h} 
              onToggle={() => handleToggle(h.id, 'weekly', h.completed)}
              onDelete={() => handleDelete(h.id, h.name, 'weekly', h.isOneOff)}
            />
          ))}
          {weeklyStats.habits.length === 0 && <p className="text-black/20 italic text-sm">No weekly habits for this week</p>}
        </div>
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

          <button
            type="submit"
            className="w-full py-5 bg-black text-white rounded-2xl font-bold text-lg shadow-lg active:scale-95 transition-transform"
          >
            Confirm
          </button>
        </form>
      </Modal>
    </motion.div>
  );
};

const HabitRow: React.FC<{ habit: any; onToggle: () => void; onDelete: () => void }> = ({ habit, onToggle, onDelete }) => {
  return (
    <div className="flex items-center group">
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
      <span className={cn(
        "flex-1 ml-4 font-medium text-lg transition-all",
        habit.completed ? "text-black/30 line-through" : "text-black"
      )}>
        {habit.name}
      </span>
      <button
        onClick={onDelete}
        className="p-2 text-black/10 hover:text-red-500 transition-colors"
      >
        <Trash2 size={20} />
      </button>
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
