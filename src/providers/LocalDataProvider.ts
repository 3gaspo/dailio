import { DataProvider, Habit, PeriodDoc, Periodicity, Category } from '../types';

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

    // If history only, we also need to update habit createdAt to "now"
    // so they don't show up as red in the past.
    if (option === 'history') {
      const habits = await this.getHabits(uid);
      const now = new Date();
      habits.forEach(h => {
        h.createdAt = now;
      });
      localStorage.setItem(this.getStorageKey(uid, 'habits'), JSON.stringify(habits));
    }
  }

  async getCategories(uid: string): Promise<Category[]> {
    const data = localStorage.getItem(this.getStorageKey(uid, 'categories'));
    if (!data) {
      const defaults = [
        { id: 'cat_chores', name: 'Chores' },
        { id: 'cat_sport', name: 'Sport' },
        { id: 'cat_culture', name: 'Culture' },
        { id: 'cat_work', name: 'Work' }
      ];
      localStorage.setItem(this.getStorageKey(uid, 'categories'), JSON.stringify(defaults));
      return defaults;
    }
    return JSON.parse(data);
  }

  async addCategory(uid: string, name: string): Promise<string> {
    const categories = await this.getCategories(uid);
    const id = Math.random().toString(36).substr(2, 9);
    categories.push({ id, name });
    localStorage.setItem(this.getStorageKey(uid, 'categories'), JSON.stringify(categories));
    return id;
  }

  async deleteCategory(uid: string, categoryId: string): Promise<void> {
    const categories = await this.getCategories(uid);
    const filtered = categories.filter(c => c.id !== categoryId);
    localStorage.setItem(this.getStorageKey(uid, 'categories'), JSON.stringify(filtered));
  }
}
