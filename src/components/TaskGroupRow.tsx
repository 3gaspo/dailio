import { ActionButton } from '@3gaspo/app-ui/ActionButton';
import React, { useState, useMemo } from 'react';
import { TaskGroup, Category } from '../types';
import { ComputedHabit } from '../utils/habitLogic';
import { ChevronRight, Folder, Check, Trash2, Edit3, GripVertical, Layers } from 'lucide-react';
import { cn } from '../utils/cn';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { HabitRow } from './HabitRow';

interface TaskGroupRowProps {
  group: TaskGroup;
  habits: (ComputedHabit & { completed: boolean; isBold?: boolean })[];
  categories: Category[];
  isReorderMode: boolean;
  isGroupingMode: boolean;
  onToggleGroup: () => void;
  onToggleHabit: (id: string, isOneOff: boolean, completed: boolean) => void;
  onSubToggleHabit: (id: string, isOneOff: boolean, idx: number) => void;
  onDeleteHabit: (id: string, name: string, isOneOff: boolean) => void;
  onEditHabit?: (habit: any) => void;
  onUngroup: () => void;
  onRenameGroup: (newName: string) => void;
  onReorderHabitsInGroup: (newHabitOrder: string[]) => void;
  onIncrementHabitCount?: (id: string) => void;
  onDecrementHabitCount?: (id: string) => void;
}

export const TaskGroupRow: React.FC<TaskGroupRowProps> = ({
  group,
  habits,
  categories,
  isReorderMode,
  isGroupingMode,
  onToggleGroup,
  onToggleHabit,
  onSubToggleHabit,
  onDeleteHabit,
  onEditHabit,
  onUngroup,
  onRenameGroup,
  onReorderHabitsInGroup,
  onIncrementHabitCount,
  onDecrementHabitCount
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameInput, setEditNameInput] = useState(group.name);

  const totalTasks = habits.length;
  const completedTasks = habits.filter(h => h.completed).length;
  const isAllCompleted = totalTasks > 0 && completedTasks === totalTasks;

  const hasOrangeSubtask = useMemo(() => {
    return habits.some(h => !!h.isBold);
  }, [habits]);

  const displayHabits = useMemo(() => {
    if (isReorderMode) {
      return habits;
    }
    const unchecked = habits.filter(h => !h.completed);
    const checked = habits.filter(h => h.completed);
    return [...unchecked, ...checked];
  }, [habits, isReorderMode]);

  const handleSaveName = () => {
    if (editNameInput.trim() && editNameInput.trim() !== group.name) {
      onRenameGroup(editNameInput.trim());
    }
    setIsEditingName(false);
  };

  return (
    <div className={cn(
      "flex flex-col bg-white dark:bg-white/5 rounded-2xl border shadow-xs overflow-hidden transition-all",
      hasOrangeSubtask
        ? (isExpanded 
            ? "border-orange-500/35 dark:border-orange-400/35 ring-2 ring-orange-500/20 dark:ring-orange-400/20" 
            : "border-orange-500/30 dark:border-orange-400/30 hover:border-orange-500/50 dark:hover:border-orange-400/50")
        : (isExpanded 
            ? "border-ui-border ring-2 ring-ui-ink/10"
            : "border-ui-border hover:border-black/15 dark:hover:border-white/15")
    )}>
      {/* Group Header */}
      <div className={cn(
        "task-group-header transition-colors",
        hasOrangeSubtask && !isAllCompleted
          ? "bg-orange-500/[0.04] dark:bg-orange-400/[0.04]"
          : "bg-black/[0.02] dark:bg-white/[0.02]"
      )}>
        {/* Reorder drag handle */}
        {isReorderMode && (
          <div className="p-1 text-ui-ink/30 cursor-grab active:cursor-grabbing shrink-0">
            <GripVertical size={20} />
          </div>
        )}

        {/* Master Group Checkbox */}
        {!isReorderMode && !isGroupingMode && (
          <ActionButton scope="dailio-habits"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              return onToggleGroup();
            }}
            className={cn(
              "w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all shrink-0",
              isAllCompleted 
                ? "bg-ui-primary border-black dark:border-white text-ui-primary-text shadow-xs"
                : (hasOrangeSubtask 
                    ? "border-orange-500/30 dark:border-orange-400/30 text-transparent hover:border-orange-500/60 dark:hover:border-orange-400/60" 
                    : "border-ui-ink/20 text-transparent hover:border-black/40 dark:hover:border-white/40")
            )}
            title={isAllCompleted ? "Mark group as incomplete" : "Mark group as complete"}
          >
            <Check size={18} strokeWidth={3} />
          </ActionButton>
        )}

        {/* Toggle Expand / Group Title Area */}
        <div 
          onClick={() => !isEditingName && setIsExpanded(!isExpanded)} 
          className="task-group-title flex items-center min-w-0 cursor-pointer select-none py-1"
        >
          <ChevronRight 
            size={18} 
            className={cn(
              "transition-transform duration-200 shrink-0",
              isExpanded && "rotate-90",
              hasOrangeSubtask
                ? (isAllCompleted ? "text-orange-500/40 dark:text-orange-400/40" : "text-orange-500 dark:text-orange-400")
                : (isExpanded ? "text-ui-ink" : "text-ui-ink/40")
            )} 
          />

          <Folder 
            size={18} 
            className={cn(
              "task-group-folder shrink-0 transition-colors",
              hasOrangeSubtask
                ? (isAllCompleted ? "text-orange-500/40 dark:text-orange-400/40" : "text-orange-500 dark:text-orange-400")
                : "text-ui-ink/50"
            )} 
          />

          {isEditingName ? (
            <input
              type="text"
              value={editNameInput}
              onChange={(e) => setEditNameInput(e.target.value)}
              onBlur={handleSaveName}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
              onClick={(e) => e.stopPropagation()}
              autoFocus
              className="ui-field bg-ui-surface border border-ui-ink/20 rounded-lg px-2 py-0.5 text-sm font-bold outline-none dark:text-white"
            />
          ) : (
            <span 
              title={group.name}
              className={cn(
                "font-bold text-base truncate transition-colors",
                hasOrangeSubtask
                  ? (isAllCompleted ? "text-orange-500/40 dark:text-orange-400/40 line-through" : "text-orange-500 dark:text-orange-400")
                  : (isAllCompleted ? "line-through text-ui-ink/40" : "text-ui-ink")
              )}
            >
              {group.name}
            </span>
          )}

          <span className={"ui-meta " + (cn(
            "text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full shrink-0 ml-1 transition-colors",
            hasOrangeSubtask
              ? (isAllCompleted 
                  ? "bg-orange-500/10 text-orange-500/50 dark:text-orange-400/50" 
                  : "bg-orange-500/15 text-orange-600 dark:text-orange-400 font-extrabold")
              : "bg-ui-section text-ui-ink/60"
          ))}>
            {completedTasks}/{totalTasks}
          </span>
        </div>

        {/* Group Actions */}
        <div className="task-group-actions flex items-center shrink-0">
          {!isEditingName && (
            <ActionButton scope="dailio-habits"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingName(true);
              }}
              className="ui-icon-button ui-row-action text-ui-ink/60 hover:text-black dark:hover:text-white transition-colors"
              title="Rename group"
            >
              <Edit3 size={15} />
            </ActionButton>
          )}

          <ActionButton scope="dailio-habits"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              return onUngroup();
            }}
            className="ui-icon-button ui-row-action text-ui-ink/60 hover:text-red-500 transition-colors"
            title="Ungroup tasks"
          >
            <Trash2 size={16} />
          </ActionButton>
        </div>
      </div>

      {/* Group Body (Tasks inside) */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden border-t border-ui-border bg-black/[0.01] dark:bg-white/[0.01]"
          >
            <div className={cn(
              "task-group-children space-y-2 border-l-2 transition-colors",
              hasOrangeSubtask ? "border-orange-500/35 dark:border-orange-400/35" : "border-ui-ink/10"
            )}>
              {totalTasks === 0 ? (
                <p className="ui-meta text-xs italic text-ui-ink/30 py-2">No tasks in this group</p>
              ) : isReorderMode ? (
                <Reorder.Group
                  axis="y"
                  values={habits}
                  onReorder={(newHabitList) => {
                    onReorderHabitsInGroup(newHabitList.map(h => h.id));
                  }}
                  className="space-y-2"
                >
                  {habits.map(h => (
                    <Reorder.Item key={h.id} value={h} dragListener={isReorderMode}>
                      <HabitRow
                        habit={h}
                        categories={categories}
                        isReorderMode={isReorderMode}
                        isGroupingMode={isGroupingMode}
                        onToggle={() => onToggleHabit(h.id, h.isOneOff, h.completed)}
                        onSubToggle={(idx) => onSubToggleHabit(h.id, h.isOneOff, idx)}
                        onDelete={() => onDeleteHabit(h.id, h.name, h.isOneOff)}
                        onEdit={onEditHabit ? () => onEditHabit(h) : undefined}
                        isWeekly={group.periodicity === 'weekly'}
                        onIncrementCount={onIncrementHabitCount ? () => onIncrementHabitCount(h.id) : undefined}
                        onDecrementCount={onDecrementHabitCount ? () => onDecrementHabitCount(h.id) : undefined}
                      />
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              ) : (
                displayHabits.map(h => (
                  <HabitRow
                    key={h.id}
                    habit={h}
                    categories={categories}
                    isReorderMode={isReorderMode}
                    isGroupingMode={isGroupingMode}
                    onToggle={() => onToggleHabit(h.id, h.isOneOff, h.completed)}
                    onSubToggle={(idx) => onSubToggleHabit(h.id, h.isOneOff, idx)}
                    onDelete={() => onDeleteHabit(h.id, h.name, h.isOneOff)}
                    onEdit={onEditHabit ? () => onEditHabit(h) : undefined}
                    isWeekly={group.periodicity === 'weekly'}
                    onIncrementCount={onIncrementHabitCount ? () => onIncrementHabitCount(h.id) : undefined}
                    onDecrementCount={onDecrementHabitCount ? () => onDecrementHabitCount(h.id) : undefined}
                  />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
