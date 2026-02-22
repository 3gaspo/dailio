import { Habit, PeriodDoc } from '../types';

export interface ComputedHabit {
  id: string;
  name: string;
  isOneOff: boolean;
}

export interface PeriodStats {
  to_do: number;
  done: number;
  ratio: number;
  habits: (ComputedHabit & { completed: boolean })[];
}

export const computePeriodStats = (
  periodKey: string,
  periodicity: 'daily' | 'weekly',
  allHabits: Habit[],
  periodDoc: PeriodDoc | null
): PeriodStats => {
  const habits: (ComputedHabit & { completed: boolean })[] = [];
  
  // 1. Recurring habits
  const recurring = allHabits.filter(h => {
    if (h.periodicity !== periodicity) return false;
    
    // createdAt is on/before the period
    const periodStart = periodicity === 'daily' 
      ? new Date(periodKey + 'T00:00:00')
      : (() => {
          const [y, w] = periodKey.split('-W');
          const d = new Date(parseInt(y), 0, 4);
          const start = new Date(d.setDate(d.getDate() + (parseInt(w) - 1) * 7));
          start.setHours(0,0,0,0);
          // Adjust to Monday
          const day = start.getDay();
          const diff = start.getDate() - day + (day === 0 ? -6 : 1);
          return new Date(start.setDate(diff));
        })();

    const created = h.createdAt instanceof Date 
      ? h.createdAt 
      : (h.createdAt && typeof (h.createdAt as any).toDate === 'function')
        ? (h.createdAt as any).toDate()
        : new Date(h.createdAt as any);
    
    // For daily: compare day-to-day (midnight)
    // For weekly: compare week-to-week (start of ISO week)
    const getComparisonDate = (d: Date) => {
      if (periodicity === 'daily') {
        const midnight = new Date(d);
        midnight.setHours(0, 0, 0, 0);
        return midnight;
      } else {
        // Start of ISO week
        const jan4 = new Date(d.getFullYear(), 0, 4);
        const startOfFirstWeek = new Date(jan4);
        const day = jan4.getDay();
        const diff = jan4.getDate() - day + (day === 0 ? -6 : 1);
        startOfFirstWeek.setDate(diff);
        startOfFirstWeek.setHours(0, 0, 0, 0);
        
        // This is a bit complex to do manually, let's use a simpler approach:
        // Just find the Monday on or before the date
        const result = new Date(d);
        result.setHours(0, 0, 0, 0);
        const dayOfWeek = result.getDay();
        const diffToMonday = result.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        result.setDate(diffToMonday);
        return result;
      }
    };

    const createdCompare = getComparisonDate(created);
    const periodCompare = getComparisonDate(periodStart);

    if (createdCompare > periodCompare) return false;

    // deletedFromPeriodKey is null OR periodKey is strictly before deletedFromPeriodKey
    if (h.deletedFromPeriodKey) {
      if (periodKey >= h.deletedFromPeriodKey) return false;
    }

    // Not skipped
    if (periodDoc?.skippedHabitIds?.includes(h.id)) return false;

    return true;
  });

  recurring.forEach(h => {
    habits.push({
      id: h.id,
      name: h.name,
      isOneOff: false,
      completed: !!periodDoc?.done?.[h.id]
    });
  });

  // 2. One-off habits
  if (periodDoc?.oneOffHabits) {
    periodDoc.oneOffHabits.forEach(h => {
      habits.push({
        id: h.id,
        name: h.name,
        isOneOff: true,
        completed: !!periodDoc?.done?.[h.id]
      });
    });
  }

  const to_do = habits.length;
  const doneCount = habits.filter(h => h.completed).length;
  const ratio = to_do === 0 ? 0 : doneCount / to_do;

  return {
    to_do,
    done: doneCount,
    ratio,
    habits
  };
};
