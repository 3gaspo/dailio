import { ActionButton } from '@3gaspo/app-ui/ActionButton';
import { formatDate, formatMonth } from '@3gaspo/app-ui/formats';
import { ValidatedForm } from '../components/ValidatedForm';
import { CalendarHeader } from '../components/CalendarHeader';
import { StateFeedback } from '../components/StateFeedback';
import React, { useEffect, useState } from 'react';
import { useApp } from '../providers/AppProvider';
import { getDailyKey, getWeeklyKey } from '../utils/dateUtils';
import { computePeriodStats } from '../utils/habitLogic';
import { Habit, PeriodDoc, Category } from '../types';
import { ChevronLeft, ChevronRight, Plus, Trash2, Check, Pencil } from 'lucide-react';
import { Modal } from '../components/Modal';
import { EditHabitModal } from '../components/EditHabitModal';
import { motion } from 'motion/react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, addMonths, subMonths, isSameMonth, isSameDay, startOfYear, endOfYear, eachWeekOfInterval, getISOWeek, getYear, isBefore, isAfter, startOfDay, isSameWeek } from 'date-fns';

export const CalendarPage: React.FC = () => {
  const { user, data, settings } = useApp();
  const [view, setView] = useState<'daily' | 'weekly'>(() => {
    return (localStorage.getItem('dailio_calendar_view') as 'daily' | 'weekly') || 'daily';
  });
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [habits, setHabits] = useState<Habit[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [periodDocs, setPeriodDocs] = useState<Record<string, PeriodDoc>>({});
  const [loading, setLoading] = useState(true);
  
  const [selectedPeriod, setSelectedPeriod] = useState<{ key: string; date: Date } | null>(null);
  const [newOneOffName, setNewOneOffName] = useState('');
  const [editingHabit, setEditingHabit] = useState<any | null>(null);

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
    const cats = await data.getCategories(user.uid);
    setCategories(cats);
    
    const docs: Record<string, PeriodDoc> = {};
    if (view === 'daily') {
      const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
      const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
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
    
    // Sync subDone
    const newSubDone = { ...(doc?.subDone || {}) };
    const stats = computePeriodStats(key, view, habits, doc || null);
    const habit = stats.habits.find(h => h.id === id);
    if (habit && habit.multiplicity > 1) {
      newSubDone[id] = !completed ? habit.multiplicity : 0;
    } else {
      newSubDone[id] = !completed ? 1 : 0;
    }

    await data.updatePeriodDoc(user.uid, view, key, { done: newDone, subDone: newSubDone });
    fetchData();
  };

  const handleIncrementWeekly = async (id: string) => {
    if (!user || !selectedPeriod) return;
    const { key } = selectedPeriod;
    const doc = periodDocs[key];
    const stats = computePeriodStats(key, view, habits, doc || null);
    const habit = stats.habits.find(h => h.id === id);
    if (!habit || !habit.completed || habit.multiplicity > 1) return;

    const currentCount = habit.subDone > 0 ? habit.subDone : 1;
    const newCount = currentCount + 1;

    const newDone = { ...(doc?.done || {}), [id]: true };
    const newSubDone = { ...(doc?.subDone || {}), [id]: newCount };

    await data.updatePeriodDoc(user.uid, view, key, { done: newDone, subDone: newSubDone });
    fetchData();
  };

  const handleSubToggle = async (id: string, subIndex: number) => {
    if (!user || !selectedPeriod) return;
    const { key } = selectedPeriod;
    const doc = periodDocs[key];
    const stats = computePeriodStats(key, view, habits, doc || null);
    const habit = stats.habits.find(h => h.id === id);
    if (!habit || habit.multiplicity <= 1) return;

    const currentSubDone = habit.subDone;
    let newCount = subIndex < currentSubDone ? subIndex : subIndex + 1;
    const isNowDone = habit.isAntiTask ? (newCount < habit.multiplicity) : (newCount >= habit.multiplicity);

    const newDone = { ...(doc?.done || {}), [id]: isNowDone };
    const newSubDone = { ...(doc?.subDone || {}), [id]: newCount };

    await data.updatePeriodDoc(user.uid, view, key, { done: newDone, subDone: newSubDone });
    fetchData();
  };

  const handleDecrementWeekly = async (id: string) => {
    if (!user || !selectedPeriod) return;
    const { key } = selectedPeriod;
    const doc = periodDocs[key];
    const stats = computePeriodStats(key, view, habits, doc || null);
    const habit = stats.habits.find(h => h.id === id);
    if (!habit || !habit.completed || habit.multiplicity > 1) return;

    const currentCount = habit.subDone > 0 ? habit.subDone : 1;
    if (currentCount <= 1) return;
    const newCount = currentCount - 1;

    const newDone = { ...(doc?.done || {}), [id]: true };
    const newSubDone = { ...(doc?.subDone || {}), [id]: newCount };

    await data.updatePeriodDoc(user.uid, view, key, { done: newDone, subDone: newSubDone });
    fetchData();
  };

  const handleSkip = async (id: string) => {
    if (!user || !selectedPeriod) return;
    const { key } = selectedPeriod;
    const doc = periodDocs[key];
    const newSkipped = [...(doc?.skippedHabitIds || []), id];
    const newDone = { ...(doc?.done || {}) };
    const newSubDone = { ...(doc?.subDone || {}) };
    delete newDone[id];
    delete newSubDone[id];
    await data.updatePeriodDoc(user.uid, view, key, { skippedHabitIds: newSkipped, done: newDone, subDone: newSubDone });
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
    const newSubDone = { ...(doc?.subDone || {}) };
    delete newDone[id];
    delete newSubDone[id];
    await data.updatePeriodDoc(user.uid, view, key, { oneOffHabits: newOneOffs, done: newDone, subDone: newSubDone });
    fetchData();
  };

  const handleOpenEdit = (h: any) => {
    const rawHabit = !h.isOneOff ? habits.find(habit => habit.id === h.id) : null;
    const resolvedPeriodicity = rawHabit?.periodicity || view;
    setEditingHabit({
      id: h.id,
      name: h.name,
      periodicity: resolvedPeriodicity,
      categoryId: h.categoryId,
      isOneOff: !!h.isOneOff,
      isAntiTask: !!h.isAntiTask,
      multiplicity: h.multiplicity || 1,
    });
  };

  const handleSaveEdit = async (updated: {
    name: string;
    periodicity: 'daily' | 'weekly';
    categoryId: string;
    isOneOff: boolean;
    isAntiTask: boolean;
    multiplicity: number;
  }) => {
    if (!user || !editingHabit) return;

    const habitId = editingHabit.id;
    const wasOneOff = editingHabit.isOneOff;
    const newPeriodicity = updated.periodicity;
    const newIsOneOff = updated.isOneOff;
    const trimmedName = updated.name.trim();
    const newCategoryId = updated.categoryId || undefined;
    const newMultiplicity = updated.multiplicity;
    const newIsAntiTask = updated.isAntiTask;

    if (!wasOneOff && !newIsOneOff) {
      await data.updateHabit(user.uid, habitId, {
        name: trimmedName,
        periodicity: newPeriodicity,
        categoryId: newCategoryId || '',
        multiplicity: newMultiplicity,
        isAntiTask: newIsAntiTask,
      });
    } else if (!wasOneOff && newIsOneOff) {
      if (selectedPeriod) {
        const key = selectedPeriod.key;
        const currentDoc = periodDocs[key];
        const newOneOff = {
          id: habitId,
          name: trimmedName,
          categoryId: newCategoryId,
          multiplicity: newMultiplicity > 1 ? newMultiplicity : undefined,
          isAntiTask: newIsAntiTask ? true : undefined,
        };
        await data.deleteHabit(user.uid, habitId);
        const existingOneOffs = (currentDoc?.oneOffHabits || []).filter(h => h.id !== habitId);
        await data.updatePeriodDoc(user.uid, view, key, {
          oneOffHabits: [newOneOff, ...existingOneOffs]
        });
      }
    } else if (wasOneOff && newIsOneOff) {
      if (selectedPeriod) {
        const key = selectedPeriod.key;
        const currentDoc = periodDocs[key];
        const updatedOneOff = {
          id: habitId,
          name: trimmedName,
          categoryId: newCategoryId,
          multiplicity: newMultiplicity > 1 ? newMultiplicity : undefined,
          isAntiTask: newIsAntiTask ? true : undefined,
        };
        const updatedOneOffs = (currentDoc?.oneOffHabits || []).map(h => h.id === habitId ? updatedOneOff : h);
        await data.updatePeriodDoc(user.uid, view, key, {
          oneOffHabits: updatedOneOffs
        });
      }
    } else if (wasOneOff && !newIsOneOff) {
      if (selectedPeriod) {
        const key = selectedPeriod.key;
        const currentDoc = periodDocs[key];
        const filteredOneOffs = (currentDoc?.oneOffHabits || []).filter(h => h.id !== habitId);
        await data.updatePeriodDoc(user.uid, view, key, {
          oneOffHabits: filteredOneOffs
        });
        await data.addHabit(user.uid, {
          name: trimmedName,
          periodicity: newPeriodicity,
          createdAt: new Date(),
          deletedFromPeriodKey: null,
          categoryId: newCategoryId,
          multiplicity: newMultiplicity > 1 ? newMultiplicity : undefined,
          isAntiTask: newIsAntiTask ? true : undefined,
        });
      }
    }

    setEditingHabit(null);
    await fetchData();
  };

  const handleToggleAbsent = async () => {
    if (!user || !selectedPeriod) return;
    const { key } = selectedPeriod;
    const doc = periodDocs[key] || null;
    const stats = computePeriodStats(key, view, habits, doc);
    const newAbsent = !stats.isAbsent;
    await data.updatePeriodDoc(user.uid, view, key, { isAbsent: newAbsent });
    fetchData();
  };

  const renderDaily = () => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });

    return (
      <div className="ui-calendar-grid">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <div key={`${d}-${i}`} className="ui-calendar-weekday">{d}</div>
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
          const objectiveMet = stats.to_do > 0 && stats.ratio >= settings.dailyObjective;
          const isAbsent = stats.isAbsent;

          let cellColor = "bg-ui-section text-ui-ink/40";
          if (isAbsent) {
            cellColor = "bg-ui-section text-ui-ink/40";
          } else if (isDone) {
            if (isPast || isToday) cellColor = "bg-emerald-500 text-white";
          } else if (isIncomplete) {
            if (objectiveMet) {
              cellColor = "bg-amber-400 text-white";
            } else if (isPast) {
              cellColor = "bg-red-500 text-white";
            }
          }

          return (
            <ActionButton scope="dailio-calendar"
              key={key}
              onClick={() => setSelectedPeriod({ key, date: d })}
              data-date={key} title={formatDate(d, 'long')} aria-current={isToday ? 'date' : undefined} aria-pressed={selectedPeriod?.key === key}
              className={cn(
                "ui-calendar-day transition-colors",
                !isCurrentMonth && "opacity-20",
                cellColor
              )}
            >
              <span className="text-sm font-bold">{format(d, 'd')}</span>
              {stats.to_do > 0 && !isDone && !isAbsent && (
                <div className="absolute bottom-1.5 w-1 h-1 bg-ui-ink/20 rounded-full" />
              )}
            </ActionButton>
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
      <div className="ui-calendar-weeks">
        {weeks.map(w => {
          const key = getWeeklyKey(w);
          const stats = computePeriodStats(key, 'weekly', habits, periodDocs[key] || null);
          const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
          const isCurrentWeek = isSameWeek(w, new Date(), { weekStartsOn: 1 });
          const isPastWeek = isBefore(w, currentWeekStart);
          const isDone = stats.to_do > 0 && stats.done >= stats.to_do;
          const isIncomplete = stats.to_do > 0 && stats.done < stats.to_do;
          const objectiveMet = stats.to_do > 0 && stats.ratio >= settings.weeklyObjective;
          const isAbsent = stats.isAbsent;
          const weekNum = getISOWeek(w);

          let cellColor = "bg-ui-section text-ui-ink/40";
          if (isAbsent) {
            cellColor = "bg-ui-section text-ui-ink/40";
          } else if (isDone) {
            if (isPastWeek || isCurrentWeek) cellColor = "bg-emerald-500 text-white";
          } else if (isIncomplete) {
            if (objectiveMet) {
              cellColor = "bg-amber-400 text-white";
            } else if (isPastWeek) {
              cellColor = "bg-red-500 text-white";
            }
          }

          return (
            <ActionButton scope="dailio-calendar"
              key={key}
              onClick={() => setSelectedPeriod({ key, date: w })}
              title={'Week ' + weekNum + ', ' + getYear(w)} aria-current={isCurrentWeek ? 'date' : undefined} aria-pressed={selectedPeriod?.key === key}
              className={cn(
                "ui-calendar-day transition-colors",
                cellColor
              )}
            >
              <span className="text-[10px] font-bold opacity-40 mb-0.5">W</span>
              <span className="text-sm font-bold">{weekNum}</span>
              {stats.to_do > 0 && !isDone && !isAbsent && (
                <div className="absolute bottom-1.5 w-1 h-1 bg-ui-ink/20 rounded-full" />
              )}
            </ActionButton>
          );
        })}
      </div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <header className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-8 dark:text-white">Calendar</h1>
        
        <div className="ui-segments flex items-center justify-between bg-ui-section p-1 rounded-2xl mb-8">
          <ActionButton scope="dailio-calendar" type="button" aria-pressed={view === 'daily'}
            onClick={() => setView('daily')}
            className="ui-option"
          >
            Daily
          </ActionButton>
          <ActionButton scope="dailio-calendar" type="button" aria-pressed={view === 'weekly'}
            onClick={() => setView('weekly')}
            className="ui-option"
          >
            Weekly
          </ActionButton>
        </div>


      </header>

      {loading ? <StateFeedback kind="loading" /> : (
        !user ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <h1 className="text-2xl font-bold mb-4 dark:text-white">Calendar</h1>
            <p className="text-ui-ink/40 mb-8">Please sign in to view your calendar.</p>
            <ActionButton scope="dailio-calendar"
              onClick={() => window.location.href = '/settings'}
              className="ui-button ui-button-primary px-8 py-4 bg-ui-primary text-ui-primary-text rounded-2xl font-bold shadow-lg"
            >
              Go to Settings
            </ActionButton>
          </div>
        ) : (
          view === 'daily' ? <div className="ui-calendar-card">
            <CalendarHeader title={formatMonth(currentMonth)} onPrevious={() => setCurrentMonth(subMonths(currentMonth, 1))} onNext={() => setCurrentMonth(addMonths(currentMonth, 1))} onToday={() => setCurrentMonth(new Date())} />
            {renderDaily()}
          </div> : <div className="ui-calendar-card">{renderWeekly()}</div>
        )
      )}

      <Modal
        isOpen={!!selectedPeriod}
        onClose={() => setSelectedPeriod(null)}
        title={selectedPeriod ? (view === 'daily' ? formatDate(selectedPeriod.date, 'long') : `Week ${getISOWeek(selectedPeriod.date)}, ${getYear(selectedPeriod.date)}`) : ''}
      >
        {selectedPeriod && (() => {
          const stats = computePeriodStats(selectedPeriod.key, view, habits, periodDocs[selectedPeriod.key] || null);
          return (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-ui-section rounded-2xl">
                <p className="font-bold dark:text-white">Absent</p>
                <ActionButton scope="dailio-calendar" onClick={handleToggleAbsent} role="switch" aria-label="Absent" aria-checked={stats.isAbsent} className="ui-switch-control">
                  <span className="ui-switch-track" data-checked={stats.isAbsent} aria-hidden="true"><span className="ui-switch-thumb" /></span>
                </ActionButton>
              </div>

              <div className="space-y-3">
                {stats.habits.map(h => (
                  <div key={h.id} className="flex flex-col bg-ui-section p-3 rounded-2xl">
                    <div className="calendar-task-main">
                      <ActionButton scope="dailio-calendar"
                        aria-label={`Complete ${h.name}`} aria-pressed={h.completed} onClick={() => handleToggle(h.id, h.completed)}
                        disabled={stats.isAbsent}
                        className={cn(
                          "w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all",
                          h.completed 
                            ? "bg-ui-primary border-black dark:border-white text-ui-primary-text"
                            : "border-ui-ink/10 text-transparent",
                          stats.isAbsent && "opacity-20 cursor-not-allowed"
                        )}
                      >
                        <Check size={14} strokeWidth={4} />
                      </ActionButton>
                      <span className={cn("flex-1 min-w-0 ml-3 font-medium dark:text-white truncate", (h.completed || stats.isAbsent) && "text-ui-ink/30 line-through")}>{h.name}</span>
                      
                      {view === 'weekly' && h.completed && (h.multiplicity <= 1 || !h.multiplicity) && !h.isAntiTask && (
                        <div className="flex items-center gap-1 shrink-0 mr-1">
                          {h.subDone > 1 && (
                            <div className="flex items-center gap-0.5">
                              <ActionButton scope="dailio-calendar"
                                onClick={() => handleDecrementWeekly(h.id)}
                                disabled={stats.isAbsent}
                                className="w-5 h-5 rounded-md bg-ui-section hover:bg-black/15 dark:hover:bg-white/20 text-ui-ink/60 flex items-center justify-center text-xs font-black transition-all disabled:opacity-20"
                                title="Decrease count (-1)"
                              >
                                -
                              </ActionButton>
                              <span className="px-1.5 py-0.5 rounded-md text-xs font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                                ×{h.subDone}
                              </span>
                            </div>
                          )}
                          <ActionButton scope="dailio-calendar"
                            onClick={() => handleIncrementWeekly(h.id)}
                            disabled={stats.isAbsent}
                            className="ui-button ui-button-primary px-2 py-0.5 text-xs font-black rounded-lg bg-ui-primary text-ui-primary-text hover:opacity-90 transition-all shadow-xs border border-transparent disabled:opacity-20"
                            title="Add weekly completion (+1 point)"
                          >
                            +1
                          </ActionButton>
                        </div>
                      )}

                      <ActionButton scope="dailio-calendar"
                        onClick={() => handleOpenEdit(h)}
                        disabled={stats.isAbsent}
                        className={"ui-icon-button ui-row-action " + (cn("text-ui-ink/60 hover:text-black dark:hover:text-white transition-colors", stats.isAbsent && "opacity-20 cursor-not-allowed"))}
                        title={h.isOneOff ? "Edit task" : "Edit habit"}
                      >
                        <Pencil size={16} />
                      </ActionButton>
                      <ActionButton scope="dailio-calendar"
                        onClick={() => h.isOneOff ? handleDeleteOneOff(h.id) : handleSkip(h.id)}
                        disabled={stats.isAbsent}
                        className={"ui-icon-button ui-row-action " + (cn("text-ui-ink/60 hover:text-red-500 transition-colors", stats.isAbsent && "opacity-20 cursor-not-allowed"))}
                        title={h.isOneOff ? "Delete task" : "Skip task"}
                      >
                        <Trash2 size={17} />
                      </ActionButton>
                    </div>

                    {h.multiplicity > 1 && (
                      <div className="calendar-task-steps flex flex-wrap gap-1.5 mt-2">
                        {Array.from({ length: h.multiplicity }).map((_, idx) => (
                          <ActionButton scope="dailio-calendar"
                            key={idx}
                            type="button"
                            disabled={stats.isAbsent}
                            onClick={(e) => {
                              e.stopPropagation();
                              return handleSubToggle(h.id, idx);
                            }}
                            className={cn(
                              "w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center cursor-pointer ",
                              idx < h.subDone
                                ? "bg-ui-primary border-black dark:border-white text-ui-primary-text shadow-xs"
                                : "border-ui-ink/20 text-transparent hover:border-black/40 dark:hover:border-white/40",
                              stats.isAbsent && "opacity-20 cursor-not-allowed"
                            )}
                            title={`Step ${idx + 1} of ${h.multiplicity}`}
                            aria-label={`Step ${idx + 1} of ${h.multiplicity}`} aria-pressed={idx < h.subDone}
                          >
                            <Check size={13} strokeWidth={3.5} />
                          </ActionButton>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {stats.habits.length === 0 && (
                  <p className="text-center text-ui-ink/20 py-4 italic">No habits for this period</p>
                )}
              </div>

              <ValidatedForm onSubmit={handleAddOneOff} className="pt-6 border-t border-ui-border">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newOneOffName}
                    onChange={e => setNewOneOffName(e.target.value)}
                    disabled={stats.isAbsent}
                    placeholder="Add one-off habit..."
                    className="ui-field flex-1 bg-ui-section rounded-xl px-4 py-3 outline-none focus:ring-2 ring-ui-ink/10 dark:text-white transition-all font-medium disabled:opacity-50"
                  />
                  <ActionButton scope="dailio-calendar" aria-label="Add"
                    type="submit" 
                    disabled={stats.isAbsent}
                    className="ui-icon-button bg-ui-primary text-ui-primary-text p-3 rounded-xl shadow-lg transition-transform disabled:opacity-50"
                  >
                    <Plus size={24} />
                  </ActionButton>
                </div>
              </ValidatedForm>
            </div>
          );
        })()}
      </Modal>

      <EditHabitModal
        isOpen={!!editingHabit}
        onClose={() => setEditingHabit(null)}
        habit={editingHabit}
        categories={categories}
        onSave={handleSaveEdit as any}
        showGroupOption={false}
      />
    </motion.div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
