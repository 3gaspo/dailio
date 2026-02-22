import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthProvider, DataProvider, User } from '../types';
import { LocalAuthProvider } from './LocalAuthProvider';
import { LocalDataProvider } from './LocalDataProvider';
import { FirebaseAuthProvider } from './FirebaseAuthProvider';
import { FirestoreDataProvider } from './FirestoreDataProvider';

interface AppContextType {
  auth: AuthProvider;
  data: DataProvider;
  user: User | null;
  isDevMode: boolean;
  loading: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<{
    auth: AuthProvider;
    data: DataProvider;
    user: User | null;
    isDevMode: boolean;
    loading: boolean;
  } | null>(null);

  useEffect(() => {
    const hasFirebase = !!import.meta.env.VITE_FIREBASE_API_KEY;
    const auth = hasFirebase ? new FirebaseAuthProvider() : new LocalAuthProvider();
    const data = hasFirebase ? new FirestoreDataProvider() : new LocalDataProvider();

    const unsubscribe = auth.onAuthStateChanged((user) => {
      setState({
        auth,
        data,
        user,
        isDevMode: !hasFirebase,
        loading: false
      });
    });

    return unsubscribe;
  }, []);

  if (!state) return null;

  return (
    <AppContext.Provider value={state}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
