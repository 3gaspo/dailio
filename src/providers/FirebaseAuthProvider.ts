import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { AuthProvider, User } from '../types';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export class FirebaseAuthProvider implements AuthProvider {
  private auth;

  constructor() {
    const app = initializeApp(firebaseConfig);
    this.auth = getAuth(app);
  }

  getUser() {
    const u = this.auth.currentUser;
    return u ? { uid: u.uid, email: u.email } : null;
  }

  async signIn(email: string, pass: string) {
    await signInWithEmailAndPassword(this.auth, email, pass);
  }

  async signUp(email: string, pass: string) {
    await createUserWithEmailAndPassword(this.auth, email, pass);
  }

  async signOut() {
    await signOut(this.auth);
  }

  onAuthStateChanged(callback: (user: User | null) => void) {
    return onAuthStateChanged(this.auth, (u) => {
      callback(u ? { uid: u.uid, email: u.email } : null);
    });
  }
}
