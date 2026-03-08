import { DataProvider, Habit, PeriodDoc, Periodicity } from '../types';

export class LocalDataProvider implements DataProvider {
  private getStorageKey(uid: string, type: string) {
    return `dailio_${uid}_${type}`;
  }

  async getHabits(uid: string): Promise<Habit[]> {
    const data = localStorage.getItem(this.getStorageKey(uid, 'habits'));
    return data ? JSON.parse(data) : [];
  }

  async addHabit(uid: string, habit: Omit<Habit, 'id'>): Promise<string> {
    const habits = await this.getHabits(uid);
    const newHabit = { ...habit, id: Math.random().toString(36).substr(2, 9) };
    habits.push(newHabit as Habit);
    localStorage.setItem(this.getStorageKey(uid, 'habits'), JSON.stringify(habits));
    return newHabit.id;
  }

  async setHabitDeletedFromPeriodKey(uid: string, habitId: string, periodKey: string): Promise<void> {
    const habits = await this.getHabits(uid);
    const habit = habits.find(h => h.id === habitId);
    if (habit) {
      habit.deletedFromPeriodKey = periodKey;
      localStorage.setItem(this.getStorageKey(uid, 'habits'), JSON.stringify(habits));
    }
  }

  async updateHabitOrder(uid: string, habitId: string, order: number): Promise<void> {
    const habits = await this.getHabits(uid);
    const habit = habits.find(h => h.id === habitId);
    if (habit) {
      habit.order = order;
      localStorage.setItem(this.getStorageKey(uid, 'habits'), JSON.stringify(habits));
    }
  }

  async getPeriodDoc(uid: string, periodicity: Periodicity, periodKey: string): Promise<PeriodDoc | null> {
    const key = this.getStorageKey(uid, `period_${periodicity}_${periodKey}`);
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }

  async updatePeriodDoc(uid: string, periodicity: Periodicity, periodKey: string, data: Partial<PeriodDoc>): Promise<void> {
    const current = await this.getPeriodDoc(uid, periodicity, periodKey) || {
      done: {},
      skippedHabitIds: [],
      oneOffHabits: [],
      updatedAt: new Date()
    };
    const updated = { ...current, ...data, updatedAt: new Date() };
    localStorage.setItem(this.getStorageKey(uid, `period_${periodicity}_${periodKey}`), JSON.stringify(updated));
  }

  async resetData(uid: string, option: 'history' | 'all'): Promise<void> {
    const keys = Object.keys(localStorage);
    keys.forEach(k => {
      if (option === 'all') {
        if (k.startsWith(`dailio_${uid}`)) {
          localStorage.removeItem(k);
        }
      } else {
        // history only: delete period docs but keep habits
        if (k.startsWith(`dailio_${uid}_period_`)) {
          localStorage.removeItem(k);
        }
      }
    });
  }
}
