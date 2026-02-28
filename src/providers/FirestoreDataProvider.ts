import { getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, deleteDoc, writeBatch } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { DataProvider, Habit, PeriodDoc, Periodicity } from '../types';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export class FirestoreDataProvider implements DataProvider {
  private db;

  constructor() {
    const app = initializeApp(firebaseConfig);
    this.db = getFirestore(app);
  }

  async getHabits(uid: string): Promise<Habit[]> {
    const col = collection(this.db, 'users', uid, 'habits');
    const snap = await getDocs(col);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Habit));
  }

  async addHabit(uid: string, habit: Omit<Habit, 'id'>): Promise<string> {
    const col = collection(this.db, 'users', uid, 'habits');
    const newDoc = doc(col);
    await setDoc(newDoc, { ...habit });
    return newDoc.id;
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
      await updateDoc(d, { ...data, updatedAt: new Date() });
    } else {
      await setDoc(d, {
        done: {},
        skippedHabitIds: [],
        oneOffHabits: [],
        ...data,
        updatedAt: new Date()
      });
    }
  }

  async resetData(uid: string): Promise<void> {
    const batch = writeBatch(this.db);
    
    // This is a bit complex in Firestore without a cloud function, 
    // but for this app we'll just delete what we can find.
    const habits = await getDocs(collection(this.db, 'users', uid, 'habits'));
    habits.forEach(d => batch.delete(d.ref));
    
    const dailies = await getDocs(collection(this.db, 'users', uid, 'periodDaily'));
    dailies.forEach(d => batch.delete(d.ref));
    
    const weeklies = await getDocs(collection(this.db, 'users', uid, 'periodWeekly'));
    weeklies.forEach(d => batch.delete(d.ref));
    
    await batch.commit();
  }
}
