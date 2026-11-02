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
    containerRef.current?.querySelector('button')?.focus();
  };

  return (
    <div className={cn("relative w-full", className)} ref={containerRef} onKeyDown={event => {
      const buttons = Array.from(containerRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []) as HTMLButtonElement[];
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        if (!isOpen && !['ArrowDown', 'ArrowUp'].includes(event.key)) return;
        event.preventDefault();
        if (!isOpen) { setIsOpen(true); requestAnimationFrame(() => containerRef.current?.querySelectorAll<HTMLButtonElement>('button')[1]?.focus()); return; }
        const options = buttons.slice(1);
        const index = options.indexOf(document.activeElement as HTMLButtonElement);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (index + (event.key === 'ArrowUp' ? -1 : 1) + options.length) % options.length;
        options[next]?.focus();
      }

      if (event.key === 'Escape' && isOpen) {
        event.preventDefault();
        event.stopPropagation();
        setIsOpen(false);
        containerRef.current?.querySelector('button')?.focus();
      }
    }}>
      {label && (
        <div className="ui-meta text-[10px] font-bold uppercase tracking-widest text-ui-ink/40 mb-2 ml-1 flex items-center gap-1.5">
          <Layers size={12} />
          <span>{label}</span>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={"ui-select-trigger " + (cn(
          "w-full bg-ui-section border border-ui-border rounded-2xl px-4 py-3.5 font-bold text-sm flex items-center justify-between transition-all outline-none focus:ring-2 ring-ui-ink/10 ",
          isOpen && "ring-2 ring-ui-ink/10 bg-ui-ink/10"
        ))}
      >
        <div className="flex items-center gap-2.5 truncate">
          {isNone ? (
            <div className="flex items-center gap-2 text-ui-ink/50 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-ui-ink/20 shrink-0" />
              <span className="text-sm dark:text-white/70">None (Standalone task)</span>
            </div>
          ) : isNew ? (
            <div className="flex items-center gap-2 text-ui-ink font-bold">
              <FolderPlus size={18} className="text-ui-ink/60 shrink-0" />
              <span>Create new group...</span>
            </div>
          ) : selectedGroup ? (
            <div className="flex items-center gap-2 truncate text-ui-ink font-bold">
              <Folder size={18} className="text-ui-ink/50 shrink-0" />
              <span className="truncate">{selectedGroup.name}</span>
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2 text-ui-ink/40 shrink-0">
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
        <div role="listbox" className="ui-menu absolute top-full left-0 right-0 mt-2 z-50 bg-ui-surface border border-ui-ink/10 rounded-2xl p-2 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 max-h-60 overflow-y-auto">
          {/* None Option */}
          <button
            type="button"
            role="option" aria-selected={isNone}
            onClick={() => handleSelect('')}
            className={"ui-menu-item " + (cn(
              "w-full text-left px-3.5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-between transition-colors mb-1",
              isNone
                ? "bg-black/10 dark:bg-white/15 text-ui-ink"
                : "text-ui-ink/60 hover:bg-black/5 dark:hover:bg-white/5"
            ))}
          >
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-ui-ink/20 shrink-0" />
              <span>None (Standalone task)</span>
            </div>
            {isNone && <Check size={16} className="text-ui-ink" />}
          </button>

          {groups.length > 0 && <div className="h-px bg-ui-section my-1" />}

          {/* Group Options */}
          {groups.map(group => {
            const isSelected = value === group.id;

            return (
              <button
                key={group.id}
                type="button"
                role="option" aria-selected={isSelected} onClick={() => handleSelect(group.id)}
                className={"ui-menu-item " + (cn(
                  "w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-between mb-0.5 dark:text-white",
                  isSelected
                    ? "bg-ui-section"
                    : "hover:bg-black/5 dark:hover:bg-white/5"
                ))}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Folder size={18} className="text-ui-ink/50 shrink-0" />
                  <span className="truncate">{group.name}</span>
                </div>
                {isSelected && <Check size={16} className="text-ui-ink ml-2 shrink-0" />}
              </button>
            );
          })}

          <div className="h-px bg-ui-section my-1" />

          {/* Create New Group Option */}
          <button
            type="button"
            role="option" aria-selected={isNew}
            onClick={() => handleSelect('new')}
            className={"ui-menu-item " + (cn(
              "w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-between dark:text-white",
              isNew
                ? "bg-ui-section text-ui-ink"
                : "text-ui-ink/70 hover:bg-black/5 dark:hover:bg-white/5"
            ))}
          >
            <div className="flex items-center gap-2.5">
              <FolderPlus size={18} className="text-ui-ink/60 shrink-0" />
              <span>+ Create new group...</span>
            </div>
            {isNew && <Check size={16} className="text-ui-ink ml-2 shrink-0" />}
          </button>
        </div>
      )}
    </div>
  );
};
