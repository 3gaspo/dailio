import React, { useEffect, useState } from 'react';
import { useApp } from '../providers/AppProvider';
import { getDailyKey, getWeeklyKey } from '../utils/dateUtils';
import { computePeriodStats } from '../utils/habitLogic';
import { Habit, PeriodDoc } from '../types';
import { ChevronLeft, ChevronRight, Plus, Trash2, Check } from 'lucide-react';
import { Modal } from '../components/Modal';
import { motion } from 'motion/react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, addMonths, subMonths, isSameMonth, isSameDay, startOfYear, endOfYear, eachWeekOfInterval, getISOWeek, getYear, isBefore, isAfter, startOfDay, isSameWeek } from 'date-fns';

export const CalendarPage: React.FC = () => {
  const { user, data } = useApp();
  const [view, setView] = useState<'daily' | 'weekly'>(() => {
    return (localStorage.getItem('dailio_calendar_view') as 'daily' | 'weekly') || 'daily';
  });
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [habits, setHabits] = useState<Habit[]>([]);
  const [periodDocs, setPeriodDocs] = useState<Record<string, PeriodDoc>>({});
  const [loading, setLoading] = useState(true);
  
  const [selectedPeriod, setSelectedPeriod] = useState<{ key: string; date: Date } | null>(null);
  const [newOneOffName, setNewOneOffName] = useState('');

  useEffect(() => {
    localStorage.setItem('dailio_calendar_view', view);
  }, [view]);

  const fetchData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    const h = await data.getHabits(user.uid);
    setHabits(h);
    
    const docs: Record<string, PeriodDoc> = {};
    if (view === 'daily') {
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);
      const days = eachDayOfInterval({ start, end });
      await Promise.all(days.map(async d => {
        const key = getDailyKey(d);
        const doc = await data.getPeriodDoc(user.uid, 'daily', key);
        if (doc) docs[key] = doc;
      }));
    } else {
      const start = startOfYear(new Date());
      const end = endOfYear(new Date());
      const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
      await Promise.all(weeks.map(async w => {
        const key = getWeeklyKey(w);
        const doc = await data.getPeriodDoc(user.uid, 'weekly', key);
        if (doc) docs[key] = doc;
      }));
    }
    setPeriodDocs(docs);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user, view, currentMonth]);

  const handleToggle = async (id: string, completed: boolean) => {
    if (!user || !selectedPeriod) return;
    const { key } = selectedPeriod;
    const doc = periodDocs[key];
    const newDone = { ...(doc?.done || {}), [id]: !completed };
    await data.updatePeriodDoc(user.uid, view, key, { done: newDone });
    fetchData();
  };

  const handleSkip = async (id: string) => {
    if (!user || !selectedPeriod) return;
    const { key } = selectedPeriod;
    const doc = periodDocs[key];
    const newSkipped = [...(doc?.skippedHabitIds || []), id];
    const newDone = { ...(doc?.done || {}) };
    delete newDone[id];
    await data.updatePeriodDoc(user.uid, view, key, { skippedHabitIds: newSkipped, done: newDone });
    fetchData();
  };

  const handleAddOneOff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedPeriod || !newOneOffName.trim()) return;
    const { key } = selectedPeriod;
    const doc = periodDocs[key];
    const newOneOff = { id: Math.random().toString(36).substr(2, 9), name: newOneOffName.trim() };
    await data.updatePeriodDoc(user.uid, view, key, {
      oneOffHabits: [...(doc?.oneOffHabits || []), newOneOff]
    });
    setNewOneOffName('');
    fetchData();
  };

  const handleDeleteOneOff = async (id: string) => {
    if (!user || !selectedPeriod) return;
    const { key } = selectedPeriod;
    const doc = periodDocs[key];
    const newOneOffs = (doc?.oneOffHabits || []).filter(h => h.id !== id);
    const newDone = { ...(doc?.done || {}) };
    delete newDone[id];
    await data.updatePeriodDoc(user.uid, view, key, { oneOffHabits: newOneOffs, done: newDone });
    fetchData();
  };

  const renderDaily = () => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });

    return (
      <div className="grid grid-cols-7 gap-2">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <div key={`${d}-${i}`} className="text-center text-[10px] font-bold text-black/20 py-2">{d}</div>
        ))}
        {days.map(d => {
          const key = getDailyKey(d);
          const stats = computePeriodStats(key, 'daily', habits, periodDocs[key] || null);
          const isCurrentMonth = isSameMonth(d, currentMonth);
          const today = startOfDay(new Date());
          const isToday = isSameDay(d, today);
          const isPast = isBefore(d, today);
          const isDone = stats.to_do > 0 && stats.done === stats.to_do;
          const isIncomplete = stats.to_do > 0 && stats.done < stats.to_do;

          let cellColor = "bg-black/5 text-black/40";
          if (isDone) {
            if (isPast || isToday) cellColor = "bg-emerald-500 text-white";
          } else if (isIncomplete) {
            if (isPast) cellColor = "bg-red-500 text-white";
          }

          return (
            <button
              key={key}
              onClick={() => setSelectedPeriod({ key, date: d })}
              className={cn(
                "aspect-square rounded-xl flex flex-col items-center justify-center transition-all relative",
                !isCurrentMonth && "opacity-20",
                cellColor,
                isToday && !isDone && "ring-2 ring-black ring-inset"
              )}
            >
              <span className="text-sm font-bold">{format(d, 'd')}</span>
              {stats.to_do > 0 && !isDone && (
                <div className="absolute bottom-1.5 w-1 h-1 bg-black/20 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    );
  };

  const renderWeekly = () => {
    const start = startOfYear(new Date());
    const end = endOfYear(new Date());
    const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });

    return (
      <div className="grid grid-cols-5 gap-2">
        {weeks.map(w => {
          const key = getWeeklyKey(w);
          const stats = computePeriodStats(key, 'weekly', habits, periodDocs[key] || null);
          const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
          const isCurrentWeek = isSameWeek(w, new Date(), { weekStartsOn: 1 });
          const isPastWeek = isBefore(w, currentWeekStart);
          const isDone = stats.to_do > 0 && stats.done === stats.to_do;
          const isIncomplete = stats.to_do > 0 && stats.done < stats.to_do;
          const weekNum = getISOWeek(w);

          let cellColor = "bg-black/5 text-black/40";
          if (isDone) {
            if (isPastWeek || isCurrentWeek) cellColor = "bg-emerald-500 text-white";
          } else if (isIncomplete) {
            if (isPastWeek) cellColor = "bg-red-500 text-white";
          }

          return (
            <button
              key={key}
              onClick={() => setSelectedPeriod({ key, date: w })}
              className={cn(
                "aspect-square rounded-xl flex flex-col items-center justify-center transition-all relative",
                cellColor
              )}
            >
              <span className="text-[10px] font-bold opacity-40 mb-0.5">W</span>
              <span className="text-sm font-bold">{weekNum}</span>
              {stats.to_do > 0 && !isDone && (
                <div className="absolute bottom-1.5 w-1 h-1 bg-black/20 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <header className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-8">Calendar</h1>
        
        <div className="flex items-center justify-between bg-black/5 p-1 rounded-2xl mb-8">
          <button
            onClick={() => setView('daily')}
            className={cn(
              "flex-1 py-3 rounded-xl font-bold transition-all",
              view === 'daily' ? "bg-white shadow-sm text-black" : "text-black/30"
            )}
          >
            Daily
          </button>
          <button
            onClick={() => setView('weekly')}
            className={cn(
              "flex-1 py-3 rounded-xl font-bold transition-all",
              view === 'weekly' ? "bg-white shadow-sm text-black" : "text-black/30"
            )}
          >
            Weekly
          </button>
        </div>

        {view === 'daily' && (
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">{format(currentMonth, 'MMMM yyyy')}</h2>
            <div className="flex gap-2">
              <button onClick={() => setCurrentMonth(new Date())} className="px-4 py-2 bg-black/5 rounded-xl text-xs font-bold uppercase tracking-wider">Today</button>
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 bg-black/5 rounded-xl"><ChevronLeft size={20} /></button>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 bg-black/5 rounded-xl"><ChevronRight size={20} /></button>
            </div>
          </div>
        )}
      </header>

      {loading ? <div className="text-center py-20 font-bold text-black/20">Loading...</div> : (
        !user ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <h1 className="text-2xl font-bold mb-4">Calendar</h1>
            <p className="text-black/40 mb-8">Please sign in to view your calendar.</p>
            <button 
              onClick={() => window.location.href = '/settings'}
              className="px-8 py-4 bg-black text-white rounded-2xl font-bold shadow-lg"
            >
              Go to Settings
            </button>
          </div>
        ) : (
          view === 'daily' ? renderDaily() : renderWeekly()
        )
      )}

      <Modal
        isOpen={!!selectedPeriod}
        onClose={() => setSelectedPeriod(null)}
        title={selectedPeriod ? (view === 'daily' ? format(selectedPeriod.date, 'MMMM d, yyyy') : `Week ${getISOWeek(selectedPeriod.date)}, ${getYear(selectedPeriod.date)}`) : ''}
      >
        {selectedPeriod && (
          <div className="space-y-8">
            <div className="space-y-3">
              {computePeriodStats(selectedPeriod.key, view, habits, periodDocs[selectedPeriod.key] || null).habits.map(h => (
                <div key={h.id} className="flex items-center">
                  <button
                    onClick={() => handleToggle(h.id, h.completed)}
                    className={cn(
                      "w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all",
                      h.completed ? "bg-black border-black text-white" : "border-black/10 text-transparent"
                    )}
                  >
                    <Check size={14} strokeWidth={4} />
                  </button>
                  <span className={cn("flex-1 ml-3 font-medium", h.completed && "text-black/30 line-through")}>{h.name}</span>
                  <button
                    onClick={() => h.isOneOff ? handleDeleteOneOff(h.id) : handleSkip(h.id)}
                    className="p-2 text-black/10 hover:text-red-500"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
              {computePeriodStats(selectedPeriod.key, view, habits, periodDocs[selectedPeriod.key] || null).habits.length === 0 && (
                <p className="text-center text-black/20 py-4 italic">No habits for this period</p>
              )}
            </div>

            <form onSubmit={handleAddOneOff} className="pt-6 border-t border-black/5">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newOneOffName}
                  onChange={e => setNewOneOffName(e.target.value)}
                  placeholder="Add one-off habit..."
                  className="flex-1 bg-black/5 rounded-xl px-4 py-3 outline-none focus:ring-2 ring-black/10 transition-all font-medium"
                />
                <button type="submit" className="bg-black text-white p-3 rounded-xl shadow-lg active:scale-95 transition-transform">
                  <Plus size={24} />
                </button>
              </div>
            </form>
          </div>
        )}
      </Modal>
    </motion.div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
