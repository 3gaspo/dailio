import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthProvider, Category, DataProvider, User, UserSettings } from '../types';
import { LocalAuthProvider } from './LocalAuthProvider';
import { LocalDataProvider } from './LocalDataProvider';
import { FirebaseAuthProvider } from './FirebaseAuthProvider';
import { FirestoreDataProvider } from './FirestoreDataProvider';

interface AppContextType {
  auth: AuthProvider;
  data: DataProvider;
  user: User | null;
  categories: Category[];
  settings: UserSettings;
  updateSettings: (settings: Partial<UserSettings>) => Promise<void>;
  refreshCategories: () => Promise<void>;
  isDevMode: boolean;
  loading: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<{
    auth: AuthProvider;
    data: DataProvider;
    user: User | null;
    categories: Category[];
    settings: UserSettings;
    isDevMode: boolean;
    loading: boolean;
  } | null>(null);

  const refreshCategories = async () => {
    if (!state?.user) return;
    const cats = await state.data.getCategories(state.user.uid);
    setState(prev => prev ? { ...prev, categories: cats } : null);
  };

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    if (!state?.user) return;
    await state.data.updateSettings(state.user.uid, newSettings);
    const updated = await state.data.getSettings(state.user.uid);
    setState(prev => prev ? { ...prev, settings: updated } : null);
  };

  useEffect(() => {
    const hasFirebase = !!import.meta.env.VITE_FIREBASE_API_KEY;
    const auth = hasFirebase ? new FirebaseAuthProvider() : new LocalAuthProvider();
    const data = hasFirebase ? new FirestoreDataProvider() : new LocalDataProvider();

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      let categories: Category[] = [];
      let settings: UserSettings = { dailyObjective: 0.8, weeklyObjective: 0.8 };
      if (user) {
        [categories, settings] = await Promise.all([
          data.getCategories(user.uid),
          data.getSettings(user.uid)
        ]);
      }
      setState({
        auth,
        data,
        user,
        categories,
        settings,
        isDevMode: !hasFirebase,
        loading: false
      });
    });

    return unsubscribe;
  }, []);

  if (!state) return null;

  return (
    <AppContext.Provider value={{ ...state, refreshCategories, updateSettings }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
