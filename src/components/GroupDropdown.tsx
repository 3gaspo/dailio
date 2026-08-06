import React, { useState, useRef, useEffect } from 'react';
import { TaskGroup } from '../types';
import { ChevronDown, Check, Folder, FolderPlus, Layers, X } from 'lucide-react';
import { cn } from '../utils/cn';

interface GroupDropdownProps {
  groups: TaskGroup[];
  value: string; // '' for none, group.id, or 'new'
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}

export const GroupDropdown: React.FC<GroupDropdownProps> = ({
  groups,
  value,
  onChange,
  label = "Group (Optional)",
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedGroup = groups.find(g => g.id === value);
  const isNone = !value;
  const isNew = value === 'new';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      {label && (
        <div className="text-[10px] font-bold uppercase tracking-widest text-black/40 dark:text-white/40 mb-2 ml-1 flex items-center gap-1.5">
          <Layers size={12} />
          <span>{label}</span>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl px-4 py-3.5 font-bold text-sm flex items-center justify-between transition-all outline-none focus:ring-2 ring-black/10 dark:ring-white/10 active:scale-[0.99]",
          isOpen && "ring-2 ring-black/10 dark:ring-white/10 bg-black/10 dark:bg-white/10"
        )}
      >
        <div className="flex items-center gap-2.5 truncate">
          {isNone ? (
            <div className="flex items-center gap-2 text-black/50 dark:text-white/50 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-black/20 dark:bg-white/20 shrink-0" />
              <span className="text-sm dark:text-white/70">None (Standalone task)</span>
            </div>
          ) : isNew ? (
            <div className="flex items-center gap-2 text-black dark:text-white font-bold">
              <FolderPlus size={18} className="text-black/60 dark:text-white/60 shrink-0" />
              <span>Create new group...</span>
            </div>
          ) : selectedGroup ? (
            <div className="flex items-center gap-2 truncate text-black dark:text-white font-bold">
              <Folder size={18} className="text-black/50 dark:text-white/50 shrink-0" />
              <span className="truncate">{selectedGroup.name}</span>
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2 text-black/40 dark:text-white/40 shrink-0">
          {!isNone && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="p-1 hover:text-black dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              title="Clear group selection"
            >
              <X size={14} />
            </span>
          )}
          <ChevronDown
            size={18}
            className={cn("transition-transform duration-200", isOpen && "rotate-180")}
          />
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-2xl p-2 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 max-h-60 overflow-y-auto">
          {/* None Option */}
          <button
            type="button"
            onClick={() => handleSelect('')}
            className={cn(
              "w-full text-left px-3.5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-between transition-colors mb-1",
              isNone
                ? "bg-black/10 dark:bg-white/15 text-black dark:text-white"
                : "text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5"
            )}
          >
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-black/20 dark:bg-white/20 shrink-0" />
              <span>None (Standalone task)</span>
            </div>
            {isNone && <Check size={16} className="text-black dark:text-white" />}
          </button>

          {groups.length > 0 && <div className="h-px bg-black/5 dark:bg-white/5 my-1" />}

          {/* Group Options */}
          {groups.map(group => {
            const isSelected = value === group.id;

            return (
              <button
                key={group.id}
                type="button"
                onClick={() => handleSelect(group.id)}
                className={cn(
                  "w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-between mb-0.5 dark:text-white",
                  isSelected
                    ? "bg-black/5 dark:bg-white/10"
                    : "hover:bg-black/5 dark:hover:bg-white/5"
                )}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Folder size={18} className="text-black/50 dark:text-white/50 shrink-0" />
                  <span className="truncate">{group.name}</span>
                </div>
                {isSelected && <Check size={16} className="text-black dark:text-white ml-2 shrink-0" />}
              </button>
            );
          })}

          <div className="h-px bg-black/5 dark:bg-white/5 my-1" />

          {/* Create New Group Option */}
          <button
            type="button"
            onClick={() => handleSelect('new')}
            className={cn(
              "w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-between dark:text-white",
              isNew
                ? "bg-black/5 dark:bg-white/10 text-black dark:text-white"
                : "text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5"
            )}
          >
            <div className="flex items-center gap-2.5">
              <FolderPlus size={18} className="text-black/60 dark:text-white/60 shrink-0" />
              <span>+ Create new group...</span>
            </div>
            {isNew && <Check size={16} className="text-black dark:text-white ml-2 shrink-0" />}
          </button>
        </div>
      )}
    </div>
  );
};
