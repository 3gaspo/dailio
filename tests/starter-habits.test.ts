import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LocalDataProvider } from '../src/providers/LocalDataProvider';
import { starterSuggestions } from '../src/utils/starterHabits';
import type { Habit, StarterHabit } from '../src/types';

test('starter suggestions respect the answers, existing habits and available categories', () => {
  const categories = [
    { id: 'cat_chores', name: 'Chores' },
    { id: 'cat_sport', name: 'Exercise' },
    { id: 'custom-culture', name: 'Culture' },
  ];
  const existing: Habit[] = [{
    id: 'old-dishes', name: 'Do   the dishes', periodicity: 'daily',
    createdAt: new Date(), deletedFromPeriodKey: '2026-11-01',
  }];
  const suggestions = starterSuggestions({ dog: true, sport: ' Swimming ', instrument: ' guitar ' }, categories, existing);
  assert.deepEqual(suggestions.map(({ habit }) => [
    habit.name, habit.periodicity, habit.categoryId,
  ]), [
    ['Drink water', 'daily', undefined],
    ['Stretch', 'daily', 'cat_sport'],
    ['Clean the house', 'weekly', 'cat_chores'],
    ['Walk the dog', 'daily', 'cat_chores'],
    ['Swimming', 'weekly', 'cat_sport'],
    ['Practise guitar', 'weekly', 'custom-culture'],
    ['Read', 'weekly', 'custom-culture'],
    ['Do the laundry', 'weekly', 'cat_chores'],
  ]);
  const withoutAnswers = starterSuggestions({ dog: false, sport: ' ', instrument: '' }, [], []);
  assert.deepEqual(withoutAnswers.map(item => item.habit.name),
    ['Drink water', 'Stretch', 'Do the dishes', 'Clean the house', 'Read', 'Do the laundry']);
});

test('starter habits and completion persist together, including on retry and for legacy accounts', async () => {
  const uid = 'existing';
  const habitKey = `dailio_${uid}_habits`;
  const existing: Habit = {
    id: 'water', name: 'Drink water', periodicity: 'daily', deletedFromPeriodKey: null, createdAt: new Date(),
  };
  const values = new Map([[habitKey, JSON.stringify([existing])]]);
  let rejectWrites = true;
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (rejectWrites) throw new Error('Storage full');
      values.set(key, value);
    },
  } });
  const provider = new LocalDataProvider();
  const selected: StarterHabit[] = [
    { name: 'drink water', periodicity: 'daily' },
    { name: 'Swimming', periodicity: 'weekly', categoryId: 'cat_sport' },
    { name: 'swimming', periodicity: 'weekly', categoryId: 'cat_sport' },
  ];
  await assert.rejects(provider.completeStarterHabits(uid, selected), /Storage full/);
  assert.equal((await provider.getSettings(uid)).starterHabitsHandled, undefined);
  assert.deepEqual((await provider.getHabits(uid)).map(habit => habit.name), ['Drink water']);

  rejectWrites = false;
  await Promise.all([provider.completeStarterHabits(uid, selected), provider.completeStarterHabits(uid, selected)]);
  const reopened = new LocalDataProvider();
  assert.equal((await reopened.getSettings(uid)).starterHabitsHandled, true);
  const habits = await reopened.getHabits(uid);
  assert.deepEqual(habits.map(habit => habit.name), ['Drink water', 'Swimming']);
  await reopened.deleteHabit(uid, habits[1].id);
  await reopened.completeStarterHabits(uid, selected);
  assert.deepEqual((await reopened.getHabits(uid)).map(habit => habit.name), ['Drink water']);

  assert.equal((await reopened.getSettings('other')).starterHabitsHandled, undefined);
  await reopened.completeStarterHabits('other', []);
  await reopened.completeStarterHabits('other', selected);
  assert.equal((await reopened.getSettings('other')).starterHabitsHandled, true);
  assert.deepEqual(await reopened.getHabits('other'), []);
});
