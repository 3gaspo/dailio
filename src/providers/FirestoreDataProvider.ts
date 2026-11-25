import { getFirestore, initializeFirestore, collection, doc, documentId, getDoc, getDocs, setDoc, updateDoc, query, where, deleteDoc, writeBatch, deleteField, runTransaction } from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { DataProvider, Habit, PeriodDoc, Periodicity, Category, UserSettings, StarterHabit } from '../types';
import { getCategoryDefaultColor } from '../utils/categoryUtils';
import { DEFAULT_THEME } from '@3gaspo/app-ui/themePreference';
import { buildStarterHabits } from '../utils/starterHabits';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

function cleanData<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(cleanData) as unknown as T;
  }
  const result: any = {};
  for (const [key, value] of Object.entries(obj as any)) {
    if (value !== undefined) {
      result[key] = typeof value === 'object' && value !== null && !(value instanceof Date) && typeof (value as any).isEqual !== 'function'
        ? cleanData(value)
        : value;
    }
  }
  return result;
}

export class FirestoreDataProvider implements DataProvider {
  private db;

  constructor() {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    try {
      this.db = initializeFirestore(app, {
        ignoreUndefinedProperties: true
      });
    } catch {
      this.db = getFirestore(app);
    }
  }

  async getSettings(uid: string): Promise<UserSettings> {
    const d = doc(this.db, 'users', uid, 'settings', 'general');
    const snap = await getDoc(d);
    if (snap.exists()) {
      const settings = snap.data();
      return { dailyObjective: 0.8, weeklyObjective: 0.8, ...settings, theme: settings.theme ?? DEFAULT_THEME } as UserSettings;
    }
    return { dailyObjective: 0.8, weeklyObjective: 0.8, theme: DEFAULT_THEME };
  }

  async updateSettings(uid: string, settings: Partial<UserSettings>): Promise<void> {
    const d = doc(this.db, 'users', uid, 'settings', 'general');
    await setDoc(d, cleanData({ ...settings }), { merge: true });
  }

  async getHabits(uid: string): Promise<Habit[]> {
    const col = collection(this.db, 'users', uid, 'habits');
    const snap = await getDocs(col);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Habit));
  }

  async addHabit(uid: string, habit: Omit<Habit, 'id'>): Promise<string> {
    const col = collection(this.db, 'users', uid, 'habits');
    const newDoc = doc(col);
    await setDoc(newDoc, cleanData({ ...habit }));
    return newDoc.id;
  }

  async completeStarterHabits(uid: string, selected: readonly StarterHabit[]): Promise<void> {
    const settings = doc(this.db, 'users', uid, 'settings', 'general');
    const habits = collection(this.db, 'users', uid, 'habits');
    const existing = selected.length ? await this.getHabits(uid) : [];
    const additions = buildStarterHabits(selected, existing);

    await runTransaction(this.db, async transaction => {
      const snapshot = await transaction.get(settings);
      if (snapshot.data()?.starterHabitsHandled) return;
      for (const habit of additions) transaction.set(doc(habits), cleanData(habit));
      transaction.set(settings, { starterHabitsHandled: true }, { merge: true });
    });
  }

  async updateHabit(uid: string, habitId: string, data: Partial<Habit>): Promise<void> {
    const d = doc(this.db, 'users', uid, 'habits', habitId);
    const updatePayload: any = { ...data };
    if (data.categoryId === '' || data.categoryId === undefined || data.categoryId === null) {
      updatePayload.categoryId = deleteField();
    }
    await updateDoc(d, cleanData(updatePayload));
  }

  async deleteHabit(uid: string, habitId: string): Promise<void> {
    const d = doc(this.db, 'users', uid, 'habits', habitId);
    await deleteDoc(d);
  }

  async setHabitDeletedFromPeriodKey(uid: string, habitId: string, periodKey: string): Promise<void> {
    const d = doc(this.db, 'users', uid, 'habits', habitId);
    await updateDoc(d, { deletedFromPeriodKey: periodKey });
  }

  async updateHabitOrder(uid: string, habitId: string, order: number): Promise<void> {
    const d = doc(this.db, 'users', uid, 'habits', habitId);
    await updateDoc(d, { order });
  }

  async getPeriodDoc(uid: string, periodicity: Periodicity, periodKey: string): Promise<PeriodDoc | null> {
    const colName = periodicity === 'daily' ? 'periodDaily' : 'periodWeekly';
    const d = doc(this.db, 'users', uid, colName, periodKey);
    const snap = await getDoc(d);
    return snap.exists() ? snap.data() as PeriodDoc : null;
  }

  async updatePeriodDoc(uid: string, periodicity: Periodicity, periodKey: string, data: Partial<PeriodDoc>): Promise<void> {
    const colName = periodicity === 'daily' ? 'periodDaily' : 'periodWeekly';
    const d = doc(this.db, 'users', uid, colName, periodKey);
    const snap = await getDoc(d);
    if (snap.exists()) {
      await updateDoc(d, cleanData({ ...data, updatedAt: new Date() }));
    } else {
      await setDoc(d, cleanData({
        done: {},
        skippedHabitIds: [],
        oneOffHabits: [],
        ...data,
        updatedAt: new Date()
      }));
    }
  }

  async getPeriodDocs(uid: string, periodicity: Periodicity, startKey: string, endKey: string): Promise<Record<string, PeriodDoc>> {
    const colName = periodicity === 'daily' ? 'periodDaily' : 'periodWeekly';
    const periods = query(collection(this.db, 'users', uid, colName), where(documentId(), '>=', startKey), where(documentId(), '<=', endKey));
    const snapshot = await getDocs(periods);
    return Object.fromEntries(snapshot.docs.map(item => [item.id, item.data() as PeriodDoc]));
  }

  async resetData(uid: string, option: 'history' | 'all'): Promise<void> {
    const batch = writeBatch(this.db);
    
    if (option === 'all') {
      const habits = await getDocs(collection(this.db, 'users', uid, 'habits'));
      habits.forEach(d => batch.delete(d.ref));
      
      const categories = await getDocs(collection(this.db, 'users', uid, 'categories'));
      categories.forEach(d => batch.delete(d.ref));
      batch.set(doc(this.db, 'users', uid, 'settings', 'general'), {
        categoriesInitialized: false,
        starterHabitsHandled: false,
      }, { merge: true });
    } else {
      // history only: update habits createdAt to "now"
      // so they don't show up as red in the past.
      const habits = await getDocs(collection(this.db, 'users', uid, 'habits'));
      const now = new Date();
      habits.forEach(d => {
        batch.update(d.ref, { createdAt: now });
      });
    }
    
    const dailies = await getDocs(collection(this.db, 'users', uid, 'periodDaily'));
    dailies.forEach(d => batch.delete(d.ref));
    
    const weeklies = await getDocs(collection(this.db, 'users', uid, 'periodWeekly'));
    weeklies.forEach(d => batch.delete(d.ref));
    
    await batch.commit();
  }

  async getCategories(uid: string): Promise<Category[]> {
    const col = collection(this.db, 'users', uid, 'categories');
    const snap = await getDocs(col);
    const settingsRef = doc(this.db, 'users', uid, 'settings', 'general');
    const settings = await getDoc(settingsRef);
    // The account marker survives deletion of the final category and syncs across devices.
    const initialize = !settings.exists() || settings.data().categoriesInitialized === false;
    if (snap.empty && initialize) {
      const habits = await getDocs(collection(this.db, 'users', uid, 'habits'));
      const firstConnection = settings.exists() || habits.empty;
      const defaults = [
        { name: 'Chores', color: '#EAB308' },
        { name: 'Sport', color: '#F97316' },
        { name: 'Culture', color: '#22C55E' },
        { name: 'Work', color: '#3B82F6' },
        { name: 'Social', color: '#EC4899' },
        { name: 'Projects', color: '#A855F7' },
        { name: 'Hygiene', color: '#14B8A6' }
      ];
      const batch = writeBatch(this.db);
      const created: Category[] = [];
      for (const item of firstConnection ? defaults : []) {
        const newDoc = doc(col, `cat_${item.name.toLowerCase()}`);
        const cat = { id: newDoc.id, name: item.name, color: item.color };
        batch.set(newDoc, cleanData({ name: item.name, color: item.color }));
        created.push(cat);
      }
      batch.set(settingsRef, { categoriesInitialized: true }, { merge: true });
      await batch.commit();
      return created;
    }
    const categories = snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        name: data.name,
        color: data.color || getCategoryDefaultColor(data.name)
      } as Category;
    });

    if (settings.data()?.categoriesInitialized !== true) {
      await setDoc(settingsRef, { categoriesInitialized: true }, { merge: true });
    }

    return categories;
  }

  async addCategory(uid: string, name: string, color?: string): Promise<string> {
    const col = collection(this.db, 'users', uid, 'categories');
    const newDoc = doc(col);
    const catColor = color || getCategoryDefaultColor(name);
    await setDoc(newDoc, cleanData({ name, color: catColor }));
    return newDoc.id;
  }

  async updateCategory(uid: string, categoryId: string, data: Partial<Category>): Promise<void> {
    const d = doc(this.db, 'users', uid, 'categories', categoryId);
    await updateDoc(d, cleanData(data));
  }

  async deleteCategory(uid: string, categoryId: string): Promise<void> {
    const d = doc(this.db, 'users', uid, 'categories', categoryId);
    await deleteDoc(d);
  }
}
