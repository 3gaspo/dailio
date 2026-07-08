import { Habit, PeriodDoc } from '../types';

export interface ComputedHabit {
  id: string;
  name: string;
  isOneOff: boolean;
  categoryId?: string;
  multiplicity: number;
  subDone: number;
  isAntiTask: boolean;
  order: number;
}

export interface PeriodStats {
  to_do: number;
  done: number;
  ratio: number;
  isAbsent: boolean;
  habits: (ComputedHabit & { completed: boolean })[];
}

export const computePeriodStats = (
  periodKey: string,
  periodicity: 'daily' | 'weekly',
  allHabits: Habit[],
  periodDoc: PeriodDoc | null,
  categoryId?: string
): PeriodStats => {
  const isAbsent = !!periodDoc?.isAbsent;
  const habits: (ComputedHabit & { completed: boolean })[] = [];
  
  // 1. Recurring habits
  const recurring = allHabits.filter(h => {
    if (h.periodicity !== periodicity) return false;
    if (categoryId && h.categoryId !== categoryId) return false;
    
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
    const deletedKey = h.deletedFromPeriodKey;
    if (deletedKey && periodKey >= deletedKey) return false;

    // Not skipped
    if (periodDoc?.skippedHabitIds?.includes(h.id)) return false;

    return true;
  });

  recurring.forEach(h => {
    const multiplicity = h.multiplicity || 1;
    const isAntiTask = !!h.isAntiTask;
    const isDoneExplicitly = periodDoc?.done?.[h.id];
    
    // For anti-tasks: they are completed unless explicitly set to false
    // For normal tasks: they are completed only if explicitly set to true
    const completed = isAntiTask 
      ? (isDoneExplicitly !== false) 
      : (isDoneExplicitly === true);

    const subDone = periodDoc?.subDone?.[h.id] ?? (completed ? multiplicity : 0);

    habits.push({
      id: h.id,
      name: h.name,
      isOneOff: false,
      categoryId: h.categoryId,
      multiplicity,
      subDone,
      completed,
      isAntiTask,
      order: h.order || 0
    });
  });

  // 2. One-off habits
  if (periodDoc?.oneOffHabits) {
    periodDoc.oneOffHabits.forEach(h => {
      if (categoryId && h.categoryId !== categoryId) return;
      const multiplicity = h.multiplicity || 1;
      const isAntiTask = !!h.isAntiTask;
      const isDoneExplicitly = periodDoc?.done?.[h.id];
      
      const completed = isAntiTask 
        ? (isDoneExplicitly !== false) 
        : (isDoneExplicitly === true);

      const subDone = periodDoc?.subDone?.[h.id] ?? (completed ? multiplicity : 0);

      habits.push({
        id: h.id,
        name: h.name,
        isOneOff: true,
        categoryId: h.categoryId,
        multiplicity,
        subDone,
        completed,
        isAntiTask,
        order: 999 // One-offs always at the end by default if no habitOrder
      });
    });
  }

  // 3. Sort
  habits.sort((a, b) => {
    // Primary: completion status (unchecked first)
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }

    // Secondary: habitOrder if available
    if (periodDoc?.habitOrder) {
      const orderMap = new Map(periodDoc.habitOrder.map((id, index) => [id, index]));
      const orderA = orderMap.has(a.id) ? orderMap.get(a.id)! : 999;
      const orderB = orderMap.has(b.id) ? orderMap.get(b.id)! : 999;
      if (orderA !== orderB) return orderA - orderB;
    }

    // Tertiary: fallback to Habit.order
    if (a.order !== b.order) return a.order - b.order;

    // Fallback to name for stability
    return a.name.localeCompare(b.name);
  });

  const to_do = habits.length;
  const doneCount = habits.filter(h => h.completed).length;
  const ratio = to_do === 0 ? 0 : doneCount / to_do;

  return {
    to_do,
    done: doneCount,
    ratio,
    isAbsent,
    habits
  };
};
