import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthProvider, Category, DataProvider, User } from '../types';
import { LocalAuthProvider } from './LocalAuthProvider';
import { LocalDataProvider } from './LocalDataProvider';
import { FirebaseAuthProvider } from './FirebaseAuthProvider';
import { FirestoreDataProvider } from './FirestoreDataProvider';

interface AppContextType {
  auth: AuthProvider;
  data: DataProvider;
  user: User | null;
  categories: Category[];
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
    isDevMode: boolean;
    loading: boolean;
  } | null>(null);

  const refreshCategories = async () => {
    if (!state?.user) return;
    const cats = await state.data.getCategories(state.user.uid);
    setState(prev => prev ? { ...prev, categories: cats } : null);
  };

  useEffect(() => {
    const hasFirebase = !!import.meta.env.VITE_FIREBASE_API_KEY;
    const auth = hasFirebase ? new FirebaseAuthProvider() : new LocalAuthProvider();
    const data = hasFirebase ? new FirestoreDataProvider() : new LocalDataProvider();

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      let categories: Category[] = [];
      if (user) {
        categories = await data.getCategories(user.uid);
      }
      setState({
        auth,
        data,
        user,
        categories,
        isDevMode: !hasFirebase,
        loading: false
      });
    });

    return unsubscribe;
  }, []);

  if (!state) return null;

  return (
    <AppContext.Provider value={{ ...state, refreshCategories }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
