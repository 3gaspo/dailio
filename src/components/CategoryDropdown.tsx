import React, { useState, useRef, useEffect } from 'react';
import { Category } from '../types';
import { getCategoryColor, getContrastColor } from '../utils/categoryUtils';
import { ChevronDown, Check, Filter, X } from 'lucide-react';
import { cn } from '../utils/cn'; // If cn utility exists or inline

interface CategoryDropdownProps {
  categories: Category[];
  value: string; // category id or '' or 'all'
  onChange: (value: string) => void;
  label?: string;
  allLabel?: string;
  className?: string;
}

export const CategoryDropdown: React.FC<CategoryDropdownProps> = ({
  categories,
  value,
  onChange,
  label = "Filter by category",
  allLabel = "All categories",
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize value: 'all' or '' means no category filter
  const isAll = !value || value === 'all';
  const selectedCategory = categories.find(c => c.id === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (catId: string) => {
    onChange(catId);
    setIsOpen(false);
    containerRef.current?.querySelector('button')?.focus();
  };

  const selectedColor = selectedCategory ? getCategoryColor(selectedCategory) : null;
  const selectedTextColor = selectedColor ? getContrastColor(selectedColor) : null;

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
        <div className="ui-meta text-[10px] font-bold uppercase tracking-widest text-ui-ink/30 mb-2 ml-1 flex items-center gap-1.5">
          <Filter size={12} />
          <span>{label}</span>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={"ui-select-trigger " + (cn(
          "w-full bg-ui-section border border-ui-border rounded-2xl px-5 py-3.5 font-bold text-sm flex items-center justify-between transition-all outline-none focus:ring-2 ring-ui-ink/10 ",
          isOpen && "ring-2 ring-ui-ink/10 bg-ui-ink/10"
        ))}
      >
        <div className="flex items-center gap-2.5 truncate">
          {isAll || !selectedCategory ? (
            <div className="flex items-center gap-2 text-ui-ink/70">
              <span className="w-2.5 h-2.5 rounded-full bg-ui-ink/30 shrink-0" />
              <span className="font-bold text-sm tracking-wide dark:text-white">{allLabel}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 truncate">
              <span
                className="min-w-0 truncate text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-lg shadow-xs"
                title={selectedCategory.name}
                style={{ backgroundColor: selectedColor!, color: selectedTextColor! }}
              >
                {selectedCategory.name}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-ui-ink/40 shrink-0">
          {!isAll && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange('all');
              }}
              className="p-1 hover:text-black dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              title="Clear filter"
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
        <div role="listbox" className="ui-menu absolute top-full left-0 right-0 mt-2 z-50 bg-ui-surface border border-ui-ink/10 rounded-2xl p-2 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 max-h-64 overflow-y-auto">
          <button
            type="button"
            role="option" aria-selected={isAll}
            onClick={() => handleSelect('all')}
            className={"ui-menu-item " + (cn(
              "w-full text-left px-3.5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-between transition-colors mb-1",
              isAll
                ? "bg-black/10 dark:bg-white/15 text-ui-ink"
                : "text-ui-ink/60 hover:bg-black/5 dark:hover:bg-white/5"
            ))}
          >
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-ui-ink/20 shrink-0" />
              <span>{allLabel}</span>
            </div>
            {isAll && <Check size={16} className="text-ui-ink" />}
          </button>

          <div className="h-px bg-ui-section my-1" />

          {categories.map(cat => {
            const catColor = getCategoryColor(cat);
            const textColor = getContrastColor(catColor);
            const isSelected = value === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                role="option" aria-selected={isSelected} onClick={() => handleSelect(cat.id)}
                className={"ui-menu-item " + (cn(
                  "w-full text-left px-3.5 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-between mb-0.5",
                  isSelected
                    ? "bg-ui-section"
                    : "hover:bg-black/5 dark:hover:bg-white/5"
                ))}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span
                    className="min-w-0 truncate text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md shadow-xs"
                    title={cat.name}
                    style={{ backgroundColor: catColor, color: textColor }}
                  >
                    {cat.name}
                  </span>
                </div>
                {isSelected && <Check size={16} className="text-ui-ink ml-2 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
