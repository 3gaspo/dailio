import assert from 'node:assert/strict';
import test from 'node:test';
import { getUncompletedHabitsFromPreviousPeriod } from '../src/utils/habitLogic';
import { getDailyKey, getWeeklyKey } from '../src/utils/dateUtils';
import type { DataProvider, Habit, PeriodDoc, Periodicity } from '../src/types';
import { subDays, subWeeks } from 'date-fns';

const today = new Date(2026, 9, 31, 12);
const habit = (id: string, periodicity: Periodicity = 'daily', extra: Partial<Habit> = {}): Habit => ({
  id, name: id, periodicity, createdAt: new Date(2024, 0, 1), deletedFromPeriodKey: null, ...extra,
});
const period = (extra: Partial<PeriodDoc> = {}): PeriodDoc => ({ done: {}, skippedHabitIds: [], oneOffHabits: [], updatedAt: today, ...extra });
function provider(docs: Record<string, PeriodDoc>, bulk: boolean) {
  const calls = { single: 0, bulk: 0 };
  const data = {
    getPeriodDoc: async (_uid: string, _periodicity: Periodicity, key: string) => { calls.single++; return docs[key] ?? null; },
    ...(bulk ? { getPeriodDocs: async (_uid: string, _periodicity: Periodicity, start: string, end: string) => {
      calls.bulk++;
      return Object.fromEntries(Object.entries(docs).filter(([key]) => key >= start && key <= end));
    } } : {}),
  } as DataProvider;
  return { data, calls };
}

test('keeps completion, skipped, deleted, anti-task and multiplicity rules across absent days', async () => {
  const activeKey = getDailyKey(subDays(today, 3));
  const habits = [
    habit('pending'), habit('done'), habit('anti-failed', 'daily', { isAntiTask: true }),
    habit('partial', 'daily', { multiplicity: 2 }), habit('deleted', 'daily', { deletedFromPeriodKey: activeKey }),
    habit('skipped'), habit('anti-count', 'daily', { isAntiTask: true, multiplicity: 2 }),
    habit('anti-default', 'daily', { isAntiTask: true }), habit('weekly', 'weekly'),
  ];
  const docs = {
    [getDailyKey(subDays(today, 1))]: period({ isAbsent: true }),
    [activeKey]: period({ done: { done: true, 'anti-failed': false }, subDone: { partial: 1, 'anti-count': 2 }, skippedHabitIds: ['skipped'] }),
  };
  for (const bulk of [false, true]) {
    const { data } = provider(docs, bulk);
    assert.deepEqual([...await getUncompletedHabitsFromPreviousPeriod(data, 'user', 'daily', habits, today)].sort(), ['anti-count', 'anti-failed', 'partial', 'pending', 'skipped']);
  }
});

test('an explicit non-absent empty day stops the search', async () => {
  const docs = { [getDailyKey(subDays(today, 1))]: period({ isAbsent: false }) };
  const { data } = provider(docs, true);
  assert.deepEqual([...await getUncompletedHabitsFromPreviousPeriod(data, 'user', 'daily', [habit('pending')], today)], ['pending']);
});

test('replaces 112 sequential daily/weekly reads with two range queries for empty history', async () => {
  const habits = [habit('daily'), habit('weekly', 'weekly')];
  const old = provider({}, false);
  const current = provider({}, true);
  for (const sample of [old, current]) {
    const result = await Promise.all((['daily', 'weekly'] as const).map(kind => getUncompletedHabitsFromPreviousPeriod(sample.data, 'user', kind, habits, today)));
    assert.ok(result.every(ids => ids.size === 0));
  }
  assert.equal(old.calls.single, 112);
  assert.deepEqual(current.calls, { single: 0, bulk: 2 });
});

test('keeps single and range weekly reads equivalent at year boundaries', async () => {
  for (const date of [new Date(2020, 0, 3, 12), new Date(2021, 0, 6, 12), new Date(2026, 0, 2, 12)]) {
    const docs = { [getWeeklyKey(subWeeks(date, 2))]: period({ isAbsent: false }) };
    const expected = await getUncompletedHabitsFromPreviousPeriod(provider(docs, false).data, 'user', 'weekly', [habit('weekly', 'weekly')], date);
    const actual = await getUncompletedHabitsFromPreviousPeriod(provider(docs, true).data, 'user', 'weekly', [habit('weekly', 'weekly')], date);
    assert.deepEqual(actual, expected);
  }
});

test('does not fetch history when no habit uses the selected period', async () => {
  const { data, calls } = provider({}, true);
  assert.equal((await getUncompletedHabitsFromPreviousPeriod(data, 'user', 'daily', [habit('weekly', 'weekly')], today)).size, 0);
  assert.deepEqual(calls, { single: 0, bulk: 0 });
});
