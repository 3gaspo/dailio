import { ActionButton } from '@3gaspo/app-ui/ActionButton';
import React from 'react';
import { Category } from '../types';
import { Check, GripVertical, Trash2, Pencil } from 'lucide-react';
import { cn } from '../utils/cn';
import { getCategoryColor, getContrastColor } from '../utils/categoryUtils';

export interface HabitRowProps {
  habit: any;
  categories: Category[];
  isReorderMode: boolean;
  isGroupingMode?: boolean;
  isSelected?: boolean;
  onSelectToggle?: () => void;
  onToggle: () => void;
  onSubToggle: (idx: number) => void;
  onDelete: () => void;
  onEdit?: () => void;
  isWeekly?: boolean;
  onIncrementCount?: () => void;
  onDecrementCount?: () => void;
}

export const HabitRow: React.FC<HabitRowProps> = ({
  habit, categories, isReorderMode, isGroupingMode = false, isSelected = false,
  onSelectToggle, onToggle, onSubToggle, onDelete, onEdit, isWeekly = false,
  onIncrementCount, onDecrementCount,
}) => {
  const category = categories.find(c => c.id === habit.categoryId);
  const catColor = category ? getCategoryColor(category) : '#6B7280';
  const textColor = getContrastColor(catColor);
  const managing = isReorderMode || isGroupingMode;
  const hasSteps = habit.multiplicity > 1 && !managing;
  const hasWeeklyCount = isWeekly && habit.completed && (habit.multiplicity <= 1 || !habit.multiplicity) && !habit.isAntiTask && !managing;
  const emphasis = habit.isBold ? (isWeekly ? 'Not completed in previous active week' : 'Not completed yesterday') : '';

  return (
    <div onClick={() => { if (isGroupingMode) onSelectToggle?.(); }}
      className={cn('habit-card bg-white dark:bg-white/5 rounded-2xl transition-all select-none',
        isReorderMode && 'ring-2 ring-ui-ink/5',
        isGroupingMode && 'cursor-pointer hover:bg-black/5 dark:hover:bg-white/10',
        isGroupingMode && isSelected && 'ring-2 ring-black dark:ring-white bg-ui-section')}>
      <div className="habit-grid" data-managing={managing}>
        <div className="habit-control">
          {isGroupingMode ? (
            <ActionButton scope="dailio-habits" type="button" aria-label={`Select ${habit.name}`} aria-pressed={isSelected}
              onClick={e => { e.stopPropagation(); onSelectToggle?.(); }}
              className={cn('w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all',
                isSelected ? 'bg-ui-primary border-black dark:border-white text-ui-primary-text shadow-xs' : 'border-ui-ink/30 text-transparent hover:border-black dark:hover:border-white')}>
              <Check size={16} strokeWidth={3} className={isSelected ? 'opacity-100' : 'opacity-0'} />
            </ActionButton>
          ) : isReorderMode ? (
            <div className="p-1 text-ui-ink/30 cursor-grab active:cursor-grabbing"><GripVertical size={20} /></div>
          ) : (
            <ActionButton scope="dailio-habits" type="button" aria-label={`Complete ${habit.name}`} aria-pressed={habit.completed}
              onClick={e => { e.stopPropagation(); return onToggle(); }}
              className={cn('w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all shrink-0',
                habit.completed ? 'bg-ui-primary border-black dark:border-white text-ui-primary-text' : 'border-ui-ink/10 text-transparent hover:border-black/30 dark:hover:border-white/30')}>
              <Check size={18} strokeWidth={3} className={cn(habit.isAntiTask && !habit.completed && 'rotate-45')} />
            </ActionButton>
          )}
        </div>
        <span title={emphasis ? `${habit.name} — ${emphasis}` : habit.name}
          className={cn('habit-name', habit.isBold ? 'font-bold' : 'font-medium',
            habit.completed && !isGroupingMode
              ? (habit.isBold ? 'text-orange-500/40 dark:text-orange-400/40 line-through' : 'text-ui-ink/30 line-through')
              : (habit.isBold ? 'text-orange-500 dark:text-orange-400' : 'text-ui-ink'))}>
          {habit.name}
        </span>
        <div className="habit-category-cell">
          {category && <span className="habit-category" title={category.name} style={{ backgroundColor: catColor, color: textColor }}>{category.name}</span>}
        </div>
        {!managing && <div className="habit-actions">
          {onEdit && <ActionButton scope="dailio-habits" type="button" onClick={e => { e.stopPropagation(); onEdit(); }}
            className="ui-icon-button ui-row-action text-ui-ink/60 hover:text-ui-ink" title={habit.isOneOff ? 'Edit task' : 'Edit habit'} aria-label={habit.isOneOff ? 'Edit task' : 'Edit habit'}><Pencil size={16} /></ActionButton>}
          <ActionButton scope="dailio-habits" type="button" onClick={e => { e.stopPropagation(); return onDelete(); }}
            className="ui-icon-button ui-row-action text-ui-ink/60 hover:text-red-500" title={habit.isOneOff ? 'Delete task' : 'Delete habit'} aria-label={habit.isOneOff ? 'Delete task' : 'Delete habit'}><Trash2 size={16} /></ActionButton>
        </div>}
      </div>
      {(habit.isAntiTask || hasWeeklyCount) && <div className="habit-secondary">
        {habit.isAntiTask && <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20" title="Anti-task to avoid">Anti-task</span>}
        {hasWeeklyCount && <div className="habit-weekly-count">
          {habit.subDone > 1 && <>
            {onDecrementCount && <ActionButton scope="dailio-habits" type="button" onClick={e => { e.stopPropagation(); return onDecrementCount(); }}
              className="habit-count-button bg-ui-section text-ui-ink/60" title="Decrease count (-1)" aria-label="Decrease count">−</ActionButton>}
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400" title={`${habit.subDone} completions`}>×{habit.subDone}</span>
          </>}
          {onIncrementCount && <ActionButton scope="dailio-habits" type="button" onClick={e => { e.stopPropagation(); return onIncrementCount(); }}
            className="habit-count-button bg-ui-primary text-ui-primary-text" title="Add weekly completion (+1 point)" aria-label="Add weekly completion (+1)">+1</ActionButton>}
        </div>}
      </div>}
      {hasSteps && <div className="habit-secondary habit-steps">
        <span className="habit-step-count ui-meta">{habit.subDone}/{habit.multiplicity}</span>
        <div className="habit-step-buttons">
          {Array.from({ length: habit.multiplicity }).map((_, idx) => (
            <ActionButton scope="dailio-habits" key={idx} type="button" onClick={e => { e.stopPropagation(); return onSubToggle(idx); }}
              className={cn('w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center cursor-pointer ',
                idx < habit.subDone ? 'bg-ui-primary border-black dark:border-white text-ui-primary-text shadow-xs' : 'border-ui-ink/20 text-transparent hover:border-black/40 dark:hover:border-white/40')}
              title={`Step ${idx + 1} of ${habit.multiplicity}`} aria-label={`Step ${idx + 1} of ${habit.multiplicity}`} aria-pressed={idx < habit.subDone}>
              <Check size={12} strokeWidth={3.5} />
            </ActionButton>
          ))}
        </div>
      </div>}
    </div>
  );
};
