import { appStorage } from '@3gaspo/app-ui/guestSession';
import { DataProvider, Habit, PeriodDoc, Periodicity, Category, UserSettings, ResetOption, StarterHabit } from '../types';
import { getCategoryDefaultColor } from '../utils/categoryUtils';
import { DEFAULT_THEME } from '@3gaspo/app-ui/themePreference';
import { buildStarterHabits } from '../utils/starterHabits';

interface HabitStorage {
  habits: Habit[];
  starterHabitsHandled?: boolean;
}

const newHabitId = () => Math.random().toString(36).slice(2, 11);

export class LocalDataProvider implements DataProvider {
  private getStorageKey(uid: string, type: string) {
    return `dailio_${uid}_${type}`;
  }

  async getSettings(uid: string): Promise<UserSettings> {
    const data = appStorage.getItem(this.getStorageKey(uid, 'settings'));
    const settings = this.readSettings(data);
    if (this.readHabitStorage(uid).starterHabitsHandled) settings.starterHabitsHandled = true;
    return settings;
  }

  private readSettings(data: string | null): UserSettings {
    const settings = data ? JSON.parse(data) : { dailyObjective: 0.8, weeklyObjective: 0.8 };
    return { ...settings, theme: settings.theme ?? DEFAULT_THEME };
  }

  async updateSettings(uid: string, settings: Partial<UserSettings>): Promise<void> {
    const current = this.readSettings(appStorage.getItem(this.getStorageKey(uid, 'settings')));
    const updated = { ...current, ...settings };
    appStorage.setItem(this.getStorageKey(uid, 'settings'), JSON.stringify(updated));
  }

  private readHabitStorage(uid: string): HabitStorage {
    const data = appStorage.getItem(this.getStorageKey(uid, 'habits'));
    const stored = data ? JSON.parse(data) : [];
    return Array.isArray(stored) ? { habits: stored } : stored;
  }

  private writeHabitStorage(uid: string, state: HabitStorage) {
    appStorage.setItem(this.getStorageKey(uid, 'habits'), JSON.stringify(state.starterHabitsHandled ? state : state.habits));
  }

  async getHabits(uid: string): Promise<Habit[]> {
    return this.readHabitStorage(uid).habits;
  }

  async completeStarterHabits(uid: string, selected: readonly StarterHabit[]): Promise<void> {
    const state = this.readHabitStorage(uid);
    if (state.starterHabitsHandled) return;
    const additions = buildStarterHabits(selected, state.habits).map(habit => ({ ...habit, id: newHabitId() }));
    // Keep the additions and the dismissal in one storage write.
    this.writeHabitStorage(uid, { habits: [...state.habits, ...additions], starterHabitsHandled: true });
  }

  async addHabit(uid: string, habit: Omit<Habit, 'id'>): Promise<string> {
    const state = this.readHabitStorage(uid);
    const newHabit = { ...habit, id: newHabitId() };
    state.habits.push(newHabit);
    this.writeHabitStorage(uid, state);
    return newHabit.id;
  }

  async updateHabit(uid: string, habitId: string, data: Partial<Habit>): Promise<void> {
    const state = this.readHabitStorage(uid);
    const { habits } = state;
    const index = habits.findIndex(h => h.id === habitId);
    if (index !== -1) {
      const updated = { ...habits[index], ...data };
      if (data.categoryId === '' || data.categoryId === undefined || data.categoryId === null) {
        delete updated.categoryId;
      }
      habits[index] = updated;
      this.writeHabitStorage(uid, state);
    }
  }

  async deleteHabit(uid: string, habitId: string): Promise<void> {
    const state = this.readHabitStorage(uid);
    this.writeHabitStorage(uid, { ...state, habits: state.habits.filter(h => h.id !== habitId) });
  }

  async setHabitDeletedFromPeriodKey(uid: string, habitId: string, periodKey: string): Promise<void> {
    const state = this.readHabitStorage(uid);
    const habit = state.habits.find(h => h.id === habitId);
    if (habit) {
      habit.deletedFromPeriodKey = periodKey;
      this.writeHabitStorage(uid, state);
    }
  }

  async updateHabitOrder(uid: string, habitId: string, order: number): Promise<void> {
    const state = this.readHabitStorage(uid);
    const habit = state.habits.find(h => h.id === habitId);
    if (habit) {
      habit.order = order;
      this.writeHabitStorage(uid, state);
    }
  }

  async getPeriodDoc(uid: string, periodicity: Periodicity, periodKey: string): Promise<PeriodDoc | null> {
    const key = this.getStorageKey(uid, `period_${periodicity}_${periodKey}`);
    const data = appStorage.getItem(key);
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
    appStorage.setItem(this.getStorageKey(uid, `period_${periodicity}_${periodKey}`), JSON.stringify(updated));
  }

  async getPeriodDocs(uid: string, periodicity: Periodicity, startKey: string, endKey: string): Promise<Record<string, PeriodDoc>> {
    const prefix = this.getStorageKey(uid, `period_${periodicity}_`);
    const periods: Record<string, PeriodDoc> = {};
    for (const storageKey of appStorage.keys()) {
      if (!storageKey.startsWith(prefix)) continue;
      const key = storageKey.slice(prefix.length);
      if (key < startKey || key > endKey) continue;
      const value = appStorage.getItem(storageKey);
      if (value) periods[key] = JSON.parse(value);
    }
    return periods;
  }

  async resetData(uid: string, option: 'history' | 'all'): Promise<void> {
    const keys = appStorage.keys();
    keys.forEach(k => {
      if (option === 'all') {
        if (k.startsWith(`dailio_${uid}`)) {
          appStorage.removeItem(k);
        }
      } else {
        // history only: delete period docs but keep habits
        if (k.startsWith(`dailio_${uid}_period_`)) {
          appStorage.removeItem(k);
        }
      }
    });

    // If history only, we also need to update habit createdAt to "now"
    // so they don't show up as red in the past.
    if (option === 'history') {
      const state = this.readHabitStorage(uid);
      const now = new Date();
      state.habits.forEach(h => {
        h.createdAt = now;
      });
      this.writeHabitStorage(uid, state);
    }
  }

  async getCategories(uid: string): Promise<Category[]> {
    const data = appStorage.getItem(this.getStorageKey(uid, 'categories'));
    if (data === null) {
      const existingAccount = appStorage.getItem(this.getStorageKey(uid, 'settings')) !== null || appStorage.getItem(this.getStorageKey(uid, 'habits')) !== null;
      const defaults = existingAccount ? [] : [
        { id: 'cat_chores', name: 'Chores', color: '#EAB308' },
        { id: 'cat_sport', name: 'Sport', color: '#F97316' },
        { id: 'cat_culture', name: 'Culture', color: '#22C55E' },
        { id: 'cat_work', name: 'Work', color: '#3B82F6' },
        { id: 'cat_social', name: 'Social', color: '#EC4899' },
        { id: 'cat_projects', name: 'Projects', color: '#A855F7' },
        { id: 'cat_hygiene', name: 'Hygiene', color: '#14B8A6' }
      ];
      appStorage.setItem(this.getStorageKey(uid, 'categories'), JSON.stringify(defaults));
      return defaults;
    }
    const parsed: Category[] = JSON.parse(data);
    return parsed.map(c => ({
      ...c,
      color: c.color || getCategoryDefaultColor(c.name)
    }));
  }

  async addCategory(uid: string, name: string, color?: string): Promise<string> {
    const categories = await this.getCategories(uid);
    const id = Math.random().toString(36).substr(2, 9);
    const catColor = color || getCategoryDefaultColor(name);
    categories.push({ id, name, color: catColor });
    appStorage.setItem(this.getStorageKey(uid, 'categories'), JSON.stringify(categories));
    return id;
  }

  async updateCategory(uid: string, categoryId: string, data: Partial<Category>): Promise<void> {
    const categories = await this.getCategories(uid);
    const cat = categories.find(c => c.id === categoryId);
    if (cat) {
      Object.assign(cat, data);
      appStorage.setItem(this.getStorageKey(uid, 'categories'), JSON.stringify(categories));
    }
  }

  async deleteCategory(uid: string, categoryId: string): Promise<void> {
    const categories = await this.getCategories(uid);
    const filtered = categories.filter(c => c.id !== categoryId);
    appStorage.setItem(this.getStorageKey(uid, 'categories'), JSON.stringify(filtered));
  }
}
