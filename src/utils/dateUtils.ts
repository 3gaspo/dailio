import { format, startOfISOWeek, getISOWeek, getYear } from 'date-fns';

export const getDailyKey = (date: Date = new Date()) => {
  return format(date, 'yyyy-MM-dd');
};

export const getWeeklyKey = (date: Date = new Date()) => {
  const week = getISOWeek(date);
  const year = getYear(startOfISOWeek(date));
  return `${year}-W${week.toString().padStart(2, '0')}`;
};

export const getPeriodStart = (periodKey: string, periodicity: 'daily' | 'weekly'): Date => {
  if (periodicity === 'daily') {
    return new Date(periodKey + 'T00:00:00');
  } else {
    // YYYY-Www
    const [year, weekStr] = periodKey.split('-W');
    const week = parseInt(weekStr, 10);
    // Simple way to get start of ISO week
    const jan4 = new Date(parseInt(year, 10), 0, 4);
    const startOfFirstWeek = startOfISOWeek(jan4);
    const target = new Date(startOfFirstWeek);
    target.setDate(target.getDate() + (week - 1) * 7);
    return startOfISOWeek(target);
  }
};

export const isBeforeOrEqualPeriod = (createdAt: Date, periodKey: string, periodicity: 'daily' | 'weekly'): boolean => {
  const periodStart = getPeriodStart(periodKey, periodicity);
  // We compare dates at midnight to avoid time issues
  const createdDate = new Date(createdAt);
  createdDate.setHours(0, 0, 0, 0);
  const periodDate = new Date(periodStart);
  periodDate.setHours(0, 0, 0, 0);
  
  return createdDate <= periodDate;
};
