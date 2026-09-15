import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Category, TaskGroup, Periodicity } from '../types';
import { CategoryDropdown } from './CategoryDropdown';
import { GroupDropdown } from './GroupDropdown';
import { cn } from '../utils/cn';

interface EditHabitModalProps {
  isOpen: boolean;
  onClose: () => void;
  habit: {
    id: string;
    name: string;
    periodicity: Periodicity;
    categoryId?: string;
    isOneOff: boolean;
    isAntiTask?: boolean;
    multiplicity?: number;
    groupId?: string;
  } | null;
  categories: Category[];
  dailyGroups?: TaskGroup[];
  weeklyGroups?: TaskGroup[];
  onSave: (updatedData: {
    name: string;
    periodicity: Periodicity;
    categoryId: string;
    groupId: string;
    newGroupName: string;
    isOneOff: boolean;
    isAntiTask: boolean;
    multiplicity: number;
  }) => Promise<void>;
  showGroupOption?: boolean;
}

export const EditHabitModal: React.FC<EditHabitModalProps> = ({
  isOpen,
  onClose,
  habit,
  categories,
  dailyGroups = [],
  weeklyGroups = [],
  onSave,
  showGroupOption = true,
}) => {
  const [name, setName] = useState('');
  const [periodicity, setPeriodicity] = useState<Periodicity>('daily');
  const [categoryId, setCategoryId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [isOneOff, setIsOneOff] = useState(false);
  const [isAntiTask, setIsAntiTask] = useState(false);
  const [multiplicity, setMultiplicity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (habit) {
      setName(habit.name || '');
      setPeriodicity(habit.periodicity || 'daily');
      setCategoryId(habit.categoryId || '');
      setGroupId(habit.groupId || '');
      setNewGroupName('');
      setIsOneOff(!!habit.isOneOff);
      setIsAntiTask(!!habit.isAntiTask);
      setMultiplicity(habit.multiplicity || 1);
      setError(null);
      setIsSubmitting(false);
    }
  }, [habit]);

  const activeGroups = periodicity === 'daily' ? dailyGroups : weeklyGroups;

  const handlePeriodicityChange = (newP: Periodicity) => {
    setPeriodicity(newP);
    // If the currently selected group doesn't exist in the new periodicity groups, reset it
    const targetGroups = newP === 'daily' ? dailyGroups : weeklyGroups;
    if (groupId !== 'new' && !targetGroups.some(g => g.id === groupId)) {
      setGroupId('');
      setNewGroupName('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        name: name.trim(),
        periodicity,
        categoryId,
        groupId,
        newGroupName: newGroupName.trim(),
        isOneOff,
        isAntiTask,
        multiplicity,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update habit');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit task">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-black/40 dark:text-white/40">Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full text-xl font-medium border-b-2 border-black/10 dark:border-white/10 focus:border-black dark:focus:border-white bg-transparent dark:text-white outline-none pb-1 transition-colors"
            placeholder="Drink water"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handlePeriodicityChange('daily')}
            className={cn(
              "py-3 rounded-xl border font-bold text-sm transition-all",
              periodicity === 'daily'
                ? "border-black dark:border-white bg-black/5 dark:bg-white/5 dark:text-white"
                : "border-black/10 dark:border-white/10 text-black/40 dark:text-white/40"
            )}
          >
            Daily
          </button>
          <button
            type="button"
            onClick={() => handlePeriodicityChange('weekly')}
            className={cn(
              "py-3 rounded-xl border font-bold text-sm transition-all",
              periodicity === 'weekly'
                ? "border-black dark:border-white bg-black/5 dark:bg-white/5 dark:text-white"
                : "border-black/10 dark:border-white/10 text-black/40 dark:text-white/40"
            )}
          >
            Weekly
          </button>
        </div>

        {categories.length > 0 && (
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-black/40 dark:text-white/40">Category</label>
            <CategoryDropdown
              categories={categories}
              value={categoryId}
              onChange={(val) => setCategoryId(val)}
              label=""
            />
          </div>
        )}

        {/* Group selection option */}
        {showGroupOption && (
          <div className="space-y-2">
            <GroupDropdown
              groups={activeGroups}
              value={groupId}
              onChange={(val) => {
                setGroupId(val);
                if (val !== 'new') {
                  setNewGroupName('');
                }
              }}
              label="Group (Optional)"
            />

            {groupId === 'new' && (
              <input
                type="text"
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                placeholder="Enter new group name..."
                required
                className="w-full text-sm font-medium border-b-2 border-black/10 dark:border-white/10 focus:border-black dark:focus:border-white bg-transparent dark:text-white outline-none pt-2 pb-1 transition-colors"
              />
            )}
          </div>
        )}

        <div className="flex items-center justify-between py-2 border-t border-black/5 dark:border-white/5">
          <div>
            <div className="font-bold text-sm dark:text-white">One-off task</div>
            <div className="text-xs text-black/40 dark:text-white/40">Only for this date/week</div>
          </div>
          <input
            type="checkbox"
            checked={isOneOff}
            onChange={e => setIsOneOff(e.target.checked)}
            className="w-5 h-5 rounded border-black/20 text-black focus:ring-0"
          />
        </div>

        <div className="flex items-center justify-between py-2 border-t border-black/5 dark:border-white/5">
          <div>
            <div className="font-bold text-sm dark:text-white">Anti-task</div>
            <div className="text-xs text-black/40 dark:text-white/40">Completed by default</div>
          </div>
          <input
            type="checkbox"
            checked={isAntiTask}
            onChange={e => setIsAntiTask(e.target.checked)}
            className="w-5 h-5 rounded border-black/20 text-black focus:ring-0"
          />
        </div>

        <div className="space-y-1 py-2 border-t border-black/5 dark:border-white/5">
          <div className="flex justify-between items-center mb-1">
            <label className="font-bold text-sm dark:text-white">Sub-steps</label>
            <span className="text-xs font-bold text-black/60 dark:text-white/60">
              {multiplicity} {multiplicity === 1 ? 'step' : 'steps'}
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            value={multiplicity}
            onChange={e => setMultiplicity(parseInt(e.target.value))}
            className="w-full accent-black dark:accent-white"
          />
        </div>

        {error && <p className="text-red-500 text-xs font-bold">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting || !name.trim()}
          className="w-full py-4 bg-black dark:bg-white text-white dark:text-black font-bold rounded-2xl shadow-lg hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {isSubmitting ? "Saving..." : "Save changes"}
        </button>
      </form>
    </Modal>
  );
};
