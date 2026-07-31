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
  };

  const selectedColor = selectedCategory ? getCategoryColor(selectedCategory) : null;
  const selectedTextColor = selectedColor ? getContrastColor(selectedColor) : null;

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      {label && (
        <div className="text-[10px] font-bold uppercase tracking-widest text-black/30 dark:text-white/30 mb-2 ml-1 flex items-center gap-1.5">
          <Filter size={12} />
          <span>{label}</span>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl px-5 py-3.5 font-bold text-sm flex items-center justify-between transition-all outline-none focus:ring-2 ring-black/10 dark:ring-white/10 active:scale-[0.99]",
          isOpen && "ring-2 ring-black/10 dark:ring-white/10 bg-black/10 dark:bg-white/10"
        )}
      >
        <div className="flex items-center gap-2.5 truncate">
          {isAll || !selectedCategory ? (
            <div className="flex items-center gap-2 text-black/70 dark:text-white/70">
              <span className="w-2.5 h-2.5 rounded-full bg-black/30 dark:bg-white/30 shrink-0" />
              <span className="font-bold text-sm tracking-wide dark:text-white">{allLabel}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 truncate">
              <span
                className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-lg shadow-xs shrink-0"
                style={{ backgroundColor: selectedColor!, color: selectedTextColor! }}
              >
                {selectedCategory.name}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-black/40 dark:text-white/40 shrink-0">
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
        <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-2xl p-2 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 max-h-64 overflow-y-auto">
          <button
            type="button"
            onClick={() => handleSelect('all')}
            className={cn(
              "w-full text-left px-3.5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-between transition-colors mb-1",
              isAll
                ? "bg-black/10 dark:bg-white/15 text-black dark:text-white"
                : "text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5"
            )}
          >
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-black/20 dark:bg-white/20 shrink-0" />
              <span>{allLabel}</span>
            </div>
            {isAll && <Check size={16} className="text-black dark:text-white" />}
          </button>

          <div className="h-px bg-black/5 dark:bg-white/5 my-1" />

          {categories.map(cat => {
            const catColor = getCategoryColor(cat);
            const textColor = getContrastColor(catColor);
            const isSelected = value === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleSelect(cat.id)}
                className={cn(
                  "w-full text-left px-3.5 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-between mb-0.5",
                  isSelected
                    ? "bg-black/5 dark:bg-white/10"
                    : "hover:bg-black/5 dark:hover:bg-white/5"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md shadow-xs shrink-0"
                    style={{ backgroundColor: catColor, color: textColor }}
                  >
                    {cat.name}
                  </span>
                </div>
                {isSelected && <Check size={16} className="text-black dark:text-white ml-2 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
