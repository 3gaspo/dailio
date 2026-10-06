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
  habit,
  categories,
  isReorderMode,
  isGroupingMode = false,
  isSelected = false,
  onSelectToggle,
  onToggle,
  onSubToggle,
  onDelete,
  onEdit,
  isWeekly = false,
  onIncrementCount,
  onDecrementCount
}) => {
  const category = categories.find(c => c.id === habit.categoryId);
  const catColor = category ? getCategoryColor(category) : '#6B7280';
  const textColor = getContrastColor(catColor);

  return (
    <div 
      onClick={() => {
        if (isGroupingMode && onSelectToggle) {
          onSelectToggle();
        }
      }}
      className={cn(
        "flex flex-col bg-white dark:bg-white/5 p-2 sm:p-2.5 rounded-2xl transition-all select-none",
        isReorderMode ? "ring-2 ring-black/5 dark:ring-white/5" : "",
        isGroupingMode ? "cursor-pointer hover:bg-black/5 dark:hover:bg-white/10" : "",
        isGroupingMode && isSelected ? "ring-2 ring-black dark:ring-white bg-black/5 dark:bg-white/10" : ""
      )}
    >
      <div className="flex items-center justify-between gap-2 min-w-0">
        {/* Left side: Checkbox / Reorder / Group + Title */}
        <div className="flex items-center min-w-0 flex-1 gap-3">
          <div className="flex items-center w-8 justify-center shrink-0">
            {isGroupingMode ? (
              /* Circular checkbox for grouping mode */
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSelectToggle) onSelectToggle();
                }}
                className={cn(
                  "w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all",
                  isSelected
                    ? "bg-black dark:bg-white border-black dark:border-white text-white dark:text-black shadow-xs scale-105"
                    : "border-black/30 dark:border-white/30 text-transparent hover:border-black dark:hover:border-white"
                )}
              >
                <Check size={16} strokeWidth={3} className={isSelected ? "opacity-100" : "opacity-0"} />
              </button>
            ) : isReorderMode ? (
              <div className="p-1 text-black/30 dark:text-white/30 cursor-grab active:cursor-grabbing">
                <GripVertical size={20} />
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle();
                }}
                className={cn(
                  "w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all shrink-0",
                  habit.completed 
                    ? "bg-black dark:bg-white border-black dark:border-white text-white dark:text-black" 
                    : "border-black/10 dark:border-white/10 text-transparent hover:border-black/30 dark:hover:border-white/30"
                )}
              >
                <Check size={18} strokeWidth={3} className={cn(habit.isAntiTask && !habit.completed && "rotate-45")} />
              </button>
            )}
          </div>

          {/* Title with guaranteed truncation - value never overflows */}
          <div className="min-w-0 flex-1">
            <span 
              title={habit.isBold ? (isWeekly ? "Not completed in previous active week" : "Not completed yesterday") : undefined}
              className={cn(
                "text-base sm:text-lg transition-all truncate block",
                habit.isBold ? "font-bold" : "font-medium",
                habit.completed && !isGroupingMode 
                  ? (habit.isBold ? "text-orange-500/40 dark:text-orange-400/40 line-through" : "text-black/30 dark:text-white/30 line-through")
                  : (habit.isBold ? "text-orange-500 dark:text-orange-400" : "text-black dark:text-white")
              )}
            >
              {habit.name}
            </span>
          </div>
        </div>

        {/* Right side: Consistently Placed Details (Category, Anti-task, Multiplicity/Count Value) & Actions */}
        <div className="flex items-center shrink-0 gap-1.5 sm:gap-2">
          {/* Details Section: Placed consistently across all items */}
          <div className="flex items-center gap-1.5 shrink-0">
            {habit.isAntiTask && (
              <span 
                className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 shrink-0"
                title="Anti-task to avoid"
              >
                Anti-task
              </span>
            )}

            {category && (
              <span 
                className="text-[9px] font-black uppercase tracking-[0.15em] px-2.5 py-1 rounded-md whitespace-nowrap shrink-0 shadow-xs"
                style={{ backgroundColor: catColor, color: textColor }}
              >
                {category.name}
              </span>
            )}

            {/* Weekly value counter: neatly integrated into details section */}
            {isWeekly && habit.completed && (habit.multiplicity <= 1 || !habit.multiplicity) && !habit.isAntiTask && !isReorderMode && !isGroupingMode && (
              <div className="flex items-center gap-1 shrink-0">
                {habit.subDone > 1 && (
                  <div className="flex items-center gap-0.5">
                    {onDecrementCount && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDecrementCount();
                        }}
                        className="w-6 h-6 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/15 dark:hover:bg-white/20 text-black/60 dark:text-white/60 flex items-center justify-center text-xs font-black transition-all active:scale-95"
                        title="Decrease count (-1)"
                        aria-label="Decrease count"
                      >
                        -
                      </button>
                    )}
                    <span 
                      className="px-2 py-0.5 rounded-lg text-xs font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 select-none whitespace-nowrap"
                      title={`${habit.subDone} completions`}
                    >
                      ×{habit.subDone}
                    </span>
                  </div>
                )}
                {onIncrementCount && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onIncrementCount();
                    }}
                    className="px-2 py-0.5 text-xs font-black rounded-xl bg-black dark:bg-white text-white dark:text-black hover:opacity-90 active:scale-95 transition-all shadow-xs border border-transparent flex items-center justify-center"
                    title="Add weekly completion (+1 point)"
                    aria-label="Add weekly completion (+1)"
                  >
                    +1
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Action buttons (Edit & Delete) */}
          {!isReorderMode && !isGroupingMode && (
            <div className="flex items-center shrink-0">
              {onEdit && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className="p-1.5 text-black/20 dark:text-white/20 hover:text-black dark:hover:text-white transition-colors rounded-lg"
                  title="Edit task"
                  aria-label="Edit task"
                >
                  <Pencil size={15} />
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="p-1.5 text-black/20 dark:text-white/20 hover:text-red-500 transition-colors rounded-lg"
                title="Delete task"
                aria-label="Delete task"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Multiplicity Step Indicators: Cleanly aligned with title indent */}
      {habit.multiplicity > 1 && !isReorderMode && !isGroupingMode && (
        <div className="flex items-center gap-2 ml-11 mt-2 mb-1">
          <span className="text-[10px] font-bold text-black/40 dark:text-white/40 tracking-wider shrink-0">
            {habit.subDone}/{habit.multiplicity}
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {Array.from({ length: habit.multiplicity }).map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSubToggle(idx);
                }}
                className={cn(
                  "w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center cursor-pointer active:scale-90",
                  idx < habit.subDone
                    ? "bg-black dark:bg-white border-black dark:border-white text-white dark:text-black shadow-xs"
                    : "border-black/20 dark:border-white/20 text-transparent hover:border-black/40 dark:hover:border-white/40"
                )}
                title={`Step ${idx + 1} of ${habit.multiplicity}`}
                aria-label={`Step ${idx + 1} of ${habit.multiplicity}`}
              >
                <Check size={12} strokeWidth={3.5} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
