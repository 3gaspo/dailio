import type { Category, Habit, StarterHabit } from '../types';

type StarterCategory = 'Hygiene' | 'Sport' | 'Chores' | 'Culture';
type Suggestion = StarterHabit & { category: StarterCategory };

export const starterHabitKey = (habit: StarterHabit) =>
  `${habit.periodicity}:${habit.name.trim().replace(/\s+/g, ' ').toLowerCase()}`;

export function newStarterHabits<T extends StarterHabit>(selected: readonly T[], existing: readonly StarterHabit[]): T[] {
  const seen = new Set(existing.map(starterHabitKey));
  return selected.filter(habit => {
    const key = starterHabitKey(habit);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function starterSuggestions(
  answers: { dog: boolean; sport: string; instrument: string },
  categories: readonly Category[],
  existing: readonly Habit[],
) {
  const suggestions: Suggestion[] = [
    { name: 'Drink water', periodicity: 'daily', category: 'Hygiene' },
    { name: 'Stretch', periodicity: 'daily', category: 'Sport' },
    { name: 'Do the dishes', periodicity: 'daily', category: 'Chores' },
    { name: 'Clean the house', periodicity: 'weekly', category: 'Chores' },
  ];
  const sport = answers.sport.trim();
  const instrument = answers.instrument.trim();
  if (answers.dog) suggestions.push({ name: 'Walk the dog', periodicity: 'daily', category: 'Chores' });
  if (sport) suggestions.push({ name: sport, periodicity: 'weekly', category: 'Sport' });
  if (instrument) suggestions.push({ name: `Practise ${instrument}`, periodicity: 'weekly', category: 'Culture' });
  suggestions.push(
    { name: 'Read', periodicity: 'weekly', category: 'Culture' },
    { name: 'Do the laundry', periodicity: 'weekly', category: 'Chores' },
  );

  return newStarterHabits(suggestions, existing).map(({ category, ...habit }) => {
    const slug = category.toLowerCase();
    const match = categories.find(item => item.id === `cat_${slug}`)
      ?? categories.find(item => item.name.trim().toLowerCase() === slug);
    const payload: StarterHabit = match ? { ...habit, categoryId: match.id } : habit;
    return { key: starterHabitKey(payload), habit: payload, category: match };
  });
}

export function buildStarterHabits(selected: readonly StarterHabit[], existing: readonly Habit[]): Omit<Habit, 'id'>[] {
  const createdAt = new Date();
  const nextOrder = { daily: 0, weekly: 0 };
  for (const habit of existing) {
    nextOrder[habit.periodicity] = Math.max(nextOrder[habit.periodicity], (habit.order ?? 0) + 1);
  }
  return newStarterHabits(selected, existing).map(habit => ({
    ...habit,
    createdAt,
    deletedFromPeriodKey: null,
    order: nextOrder[habit.periodicity]++,
  }));
}
