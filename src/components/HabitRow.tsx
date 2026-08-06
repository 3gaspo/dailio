import React from 'react';
import { Category } from '../types';
import { Check, GripVertical, Trash2 } from 'lucide-react';
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
  onDelete
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
        "flex flex-col bg-white dark:bg-white/5 p-2 rounded-2xl transition-all select-none",
        isReorderMode ? "ring-2 ring-black/5 dark:ring-white/5" : "",
        isGroupingMode ? "cursor-pointer hover:bg-black/5 dark:hover:bg-white/10" : "",
        isGroupingMode && isSelected ? "ring-2 ring-black dark:ring-white bg-black/5 dark:bg-white/10" : ""
      )}
    >
      <div className="flex items-center">
        <div className="flex items-center min-w-[40px] justify-center shrink-0">
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
            <div className="p-2 text-black/30 dark:text-white/30 cursor-grab active:cursor-grabbing">
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

        <div className="flex-1 ml-3 flex items-center gap-3 overflow-hidden">
          <div className="flex flex-col min-w-0">
            <span className={cn(
              "font-medium text-base sm:text-lg transition-all truncate",
              habit.completed && !isGroupingMode ? "text-black/30 dark:text-white/30 line-through" : "text-black dark:text-white"
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
            <span 
              className="text-[9px] font-black uppercase tracking-[0.15em] px-2.5 py-1 rounded-md whitespace-nowrap shrink-0 shadow-xs"
              style={{ backgroundColor: catColor, color: textColor }}
            >
              {category.name}
            </span>
          )}
        </div>

        {!isReorderMode && !isGroupingMode && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-2 text-black/10 dark:text-white/10 hover:text-red-500 transition-colors shrink-0"
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>

      {habit.multiplicity > 1 && !isReorderMode && !isGroupingMode && (
        <div className="flex gap-1.5 ml-[40px] mb-1 mt-1">
          {Array.from({ length: habit.multiplicity }).map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSubToggle(idx);
              }}
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
