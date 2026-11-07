import assert from 'node:assert/strict';
import test from 'node:test';
import { startOfISOWeek } from 'date-fns';
import { getWeeklyKey, getPeriodStart } from '../src/utils/dateUtils';

test('uses the ISO week year on both sides of New Year', () => {
  for (const [day, expected] of [
    ['2025-12-29', '2026-W01'], ['2026-01-01', '2026-W01'],
    ['2026-01-04', '2026-W01'], ['2026-01-05', '2026-W02'],
    ['2021-01-01', '2020-W53'], ['2020-12-31', '2020-W53'],
    ['2018-12-31', '2019-W01'],
  ]) {
    assert.equal(getWeeklyKey(new Date(`${day}T12:00:00`)), expected, day);
  }
});

test('weekly keys round-trip to the same Monday, including DST and year boundaries', () => {
  for (let year = 2018; year <= 2032; year++) {
    for (let offset = 0; offset < 366; offset++) {
      const date = new Date(year, 0, 1 + offset, 12);
      assert.equal(getPeriodStart(getWeeklyKey(date), 'weekly').getTime(), startOfISOWeek(date).getTime());
    }
  }
});
