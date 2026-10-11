import { Habit, PeriodDoc, DataProvider } from '../types';
import { getDailyKey, getWeeklyKey, isBeforeOrEqualPeriod } from './dateUtils';
import { subDays, subWeeks } from 'date-fns';

export interface ComputedHabit {
  id: string;
  name: string;
  isOneOff: boolean;
  categoryId?: string;
  multiplicity: number;
  subDone: number;
  isAntiTask: boolean;
  order: number;
  isBold?: boolean;
}

export interface PeriodStats {
  to_do: number;
  done: number;
  ratio: number;
  isAbsent: boolean;
  habits: (ComputedHabit & { completed: boolean })[];
}

/**
 * Checks if a period doc has any entered data by the user.
 */
export function hasEnteredData(periodDoc: PeriodDoc | null | undefined): boolean {
  if (!periodDoc) return false;
  if (periodDoc.done && Object.keys(periodDoc.done).length > 0) return true;
  if (periodDoc.subDone && Object.values(periodDoc.subDone).some(v => typeof v === 'number' && v > 0)) return true;
  if (periodDoc.oneOffHabits && periodDoc.oneOffHabits.length > 0) return true;
  if (periodDoc.skippedHabitIds && periodDoc.skippedHabitIds.length > 0) return true;
  return false;
}

/**
 * Checks if a period should be considered absent.
 * - If explicitly marked by user (isAbsent === true / false), honors it.
 * - If past period with no data entered, automatically marks as absent.
 */
export function isPeriodAbsent(
  periodDoc: PeriodDoc | null | undefined,
  periodKey: string,
  periodicity: 'daily' | 'weekly',
  currentDate: Date = new Date()
): boolean {
  if (periodDoc?.isAbsent === true) return true;
  if (periodDoc?.isAbsent === false) return false;

  const currentKey = periodicity === 'daily' ? getDailyKey(currentDate) : getWeeklyKey(currentDate);
  const isPast = periodKey < currentKey;

  if (isPast && !hasEnteredData(periodDoc)) {
    return true;
  }

  return false;
}

export const computePeriodStats = (
  periodKey: string,
  periodicity: 'daily' | 'weekly',
  allHabits: Habit[],
  periodDoc: PeriodDoc | null,
  categoryId?: string
): PeriodStats => {
  const isAbsent = isPeriodAbsent(periodDoc, periodKey, periodicity);
  const habits: (ComputedHabit & { completed: boolean })[] = [];
  const filterCat = categoryId && categoryId !== 'all' ? categoryId : null;
  
  // 1. Recurring habits
  const recurring = allHabits.filter(h => {
    if (h.periodicity !== periodicity) return false;
    if (filterCat && h.categoryId !== filterCat) return false;
    
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
    const rawCount = periodDoc?.subDone?.[h.id];

    let completed: boolean;
    let subDone: number;

    if (isAbsent) {
      // On an absent day, habits (including anti-tasks) are not active/completed
      completed = false;
      subDone = 0;
    } else if (multiplicity > 1) {
      if (rawCount !== undefined) {
        subDone = rawCount;
        completed = isAntiTask 
          ? (isDoneExplicitly !== false && subDone < multiplicity) 
          : (isDoneExplicitly === true || subDone >= multiplicity);
      } else {
        completed = isAntiTask 
          ? (isDoneExplicitly !== false) 
          : (isDoneExplicitly === true);
        subDone = completed ? multiplicity : 0;
      }
    } else {
      completed = isAntiTask 
        ? (isDoneExplicitly !== false) 
        : (isDoneExplicitly === true);
      subDone = completed
        ? (rawCount !== undefined && rawCount > 0 ? rawCount : 1)
        : 0;
    }

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
      if (filterCat && h.categoryId !== filterCat) return;
      const multiplicity = h.multiplicity || 1;
      const isAntiTask = !!h.isAntiTask;
      const isDoneExplicitly = periodDoc?.done?.[h.id];
      const rawCount = periodDoc?.subDone?.[h.id];

      let completed: boolean;
      let subDone: number;

      if (isAbsent) {
        completed = false;
        subDone = 0;
      } else if (multiplicity > 1) {
        if (rawCount !== undefined) {
          subDone = rawCount;
          completed = isAntiTask 
            ? (isDoneExplicitly !== false && subDone < multiplicity) 
            : (isDoneExplicitly === true || subDone >= multiplicity);
        } else {
          completed = isAntiTask 
            ? (isDoneExplicitly !== false) 
            : (isDoneExplicitly === true);
          subDone = completed ? multiplicity : 0;
        }
      } else {
        completed = isAntiTask 
          ? (isDoneExplicitly !== false) 
          : (isDoneExplicitly === true);
        subDone = completed
          ? (rawCount !== undefined && rawCount > 0 ? rawCount : 1)
          : 0;
      }

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
  let doneCount = 0;
  if (!isAbsent) {
    habits.forEach(h => {
      if (!h.completed) return;
      if (periodicity === 'weekly' && h.multiplicity <= 1 && !h.isAntiTask) {
        // Weekly tasks without multiplicity can be done multiple times, counting as multiple points
        doneCount += Math.max(1, h.subDone);
      } else {
        // Regular tasks and tasks that require multiplicity count only as 1 once fully completed
        doneCount += 1;
      }
    });
  }
  const ratio = (to_do === 0 || isAbsent) ? 0 : doneCount / to_do;

  return {
    to_do,
    done: doneCount,
    ratio,
    isAbsent,
    habits
  };
};

/**
 * Finds the most recent period (day or week) before the current one that was not marked absent,
 * and returns the IDs of all habits that were not completed during that period.
 * If all previous periods are absent (or no previous periods exist), returns an empty Set.
 */
export async function getUncompletedHabitsFromPreviousPeriod(
  data: DataProvider,
  uid: string,
  periodicity: 'daily' | 'weekly',
  habits: Habit[],
  currentDate: Date = new Date()
): Promise<Set<string>> {
  const relevantHabits = habits.filter(h => h.periodicity === periodicity);
  if (relevantHabits.length === 0) return new Set();

  const maxLookback = periodicity === 'daily' ? 60 : 52;

  for (let i = 1; i <= maxLookback; i++) {
    const cursor = periodicity === 'daily' 
      ? subDays(currentDate, i) 
      : subWeeks(currentDate, i);

    const key = periodicity === 'daily' ? getDailyKey(cursor) : getWeeklyKey(cursor);

    const doc = await data.getPeriodDoc(uid, periodicity, key);

    // If marked absent, skip and continue searching backwards for a non-absent period
    if (isPeriodAbsent(doc, key, periodicity, currentDate)) {
      continue;
    }

    // Found the most recent non-absent period!
    const uncompletedIds = new Set<string>();

    for (const h of relevantHabits) {
      // If habit was marked deleted before or on this key, ignore it
      if (h.deletedFromPeriodKey && key >= h.deletedFromPeriodKey) {
        continue;
      }
      // If skipped in this period doc
      if (doc?.skippedHabitIds?.includes(h.id)) {
        uncompletedIds.add(h.id);
        continue;
      }

      const multiplicity = h.multiplicity || 1;
      const isAntiTask = !!h.isAntiTask;
      const isDoneExplicitly = doc?.done?.[h.id];
      const rawCount = doc?.subDone?.[h.id];

      let completed: boolean;
      if (multiplicity > 1) {
        if (rawCount !== undefined) {
          completed = isAntiTask 
            ? (isDoneExplicitly !== false && rawCount < multiplicity) 
            : (isDoneExplicitly === true || rawCount >= multiplicity);
        } else {
          completed = isAntiTask 
            ? (isDoneExplicitly !== false) 
            : (isDoneExplicitly === true);
        }
      } else {
        completed = isAntiTask 
          ? (isDoneExplicitly !== false) 
          : (isDoneExplicitly === true);
      }

      if (!completed) {
        uncompletedIds.add(h.id);
      }
    }

    return uncompletedIds;
  }

  // All checked periods were absent or no previous period exists
  return new Set();
}
