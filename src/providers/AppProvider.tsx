import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
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
  settingsError: string | null;
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
  const settingsWrites = useRef<Promise<void>>(Promise.resolve());
  const settingsVersion = useRef(0);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const refreshCategories = async () => {
    if (!state?.user) return;
    const cats = await state.data.getCategories(state.user.uid);
    setState(prev => prev ? { ...prev, categories: cats } : null);
  };

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    if (!state?.user) return;
    const { user, data, settings: previous } = state;
    const version = ++settingsVersion.current;
    setSettingsError(null);
    setState(prev => prev?.user?.uid === user.uid ? { ...prev, settings: { ...prev.settings, ...newSettings } } : prev);
    const write = settingsWrites.current.catch(() => {}).then(() => data.updateSettings(user.uid, newSettings));
    settingsWrites.current = write;
    try {
      await write;
    } catch (error) {
      console.error('Failed to save settings:', error);
      if (version === settingsVersion.current) {
        setState(prev => prev?.user?.uid === user.uid ? { ...prev, settings: previous } : prev);
        setSettingsError('Save failed');
      }
    }
  };

  useEffect(() => {
    const hasFirebase = !!import.meta.env.VITE_FIREBASE_API_KEY;
    const auth = hasFirebase ? new FirebaseAuthProvider() : new LocalAuthProvider();
    const data = hasFirebase ? new FirestoreDataProvider() : new LocalDataProvider();

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      let categories: Category[] = [];
      let settings: UserSettings = { dailyObjective: 0.8, weeklyObjective: 0.8, theme: 'light' };
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

  useEffect(() => {
    if (state?.settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }
  }, [state?.settings.theme]);

  if (!state) return null;

  return (
    <AppContext.Provider value={{ ...state, refreshCategories, updateSettings, settingsError }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
