import { Timestamp } from 'firebase/firestore';

export type Periodicity = 'daily' | 'weekly';

export interface Habit {
  id: string;
  name: string;
  periodicity: Periodicity;
  createdAt: Date | Timestamp;
  deletedFromPeriodKey: string | null;
}

export interface OneOffHabit {
  id: string;
  name: string;
}

export interface PeriodDoc {
  done: Record<string, boolean>;
  skippedHabitIds: string[];
  oneOffHabits: OneOffHabit[];
  updatedAt: Date | Timestamp;
}

export interface User {
  uid: string;
  email: string | null;
}

export interface AuthProvider {
  getUser: () => User | null;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string) => Promise<void>;
  signOut: () => Promise<void>;
  onAuthStateChanged: (callback: (user: User | null) => void) => () => void;
}

export interface DataProvider {
  // Habits
  getHabits: (uid: string) => Promise<Habit[]>;
  addHabit: (uid: string, habit: Omit<Habit, 'id'>) => Promise<string>;
  setHabitDeletedFromPeriodKey: (uid: string, habitId: string, periodKey: string) => Promise<void>;
  
  // Period Docs
  getPeriodDoc: (uid: string, periodicity: Periodicity, periodKey: string) => Promise<PeriodDoc | null>;
  updatePeriodDoc: (uid: string, periodicity: Periodicity, periodKey: string, data: Partial<PeriodDoc>) => Promise<void>;
  
  // Actions
  resetData: (uid: string) => Promise<void>;
}
