import { appStorage, guestUser, isGuestSession } from '@3gaspo/app-ui/guestSession';
import { AuthProvider, User } from '../types';

export class LocalAuthProvider implements AuthProvider {
  private user: User | null = null;
  private listeners: ((user: User | null) => void)[] = [];

  constructor() {
    if (isGuestSession) {
      this.user = guestUser;
      return;
    }
    const stored = appStorage.getItem('dailio_user');
    if (stored) {
      try {
        this.user = JSON.parse(stored);
      } catch {
        this.user = null;
      }
    } else {
      this.user = null;
    }
  }

  getUser() {
    return this.user;
  }

  async signIn(email: string, _pass: string) {
    const cleanEmail = email.trim();
    const uid = 'dev-user-' + cleanEmail.toLowerCase().replace(/[^a-z0-9]/g, '_');
    this.user = { uid, email: cleanEmail };
    appStorage.setItem('dailio_user', JSON.stringify(this.user));
    appStorage.setItem('dailio_has_visited', 'true');
    this.notify();
  }

  async signUp(email: string, _pass: string) {
    const cleanEmail = email.trim();
    const uid = 'dev-user-' + cleanEmail.toLowerCase().replace(/[^a-z0-9]/g, '_');
    this.user = { uid, email: cleanEmail };
    appStorage.setItem('dailio_user', JSON.stringify(this.user));
    appStorage.setItem('dailio_has_visited', 'true');
    this.notify();
  }

  async signOut() {
    this.user = null;
    appStorage.removeItem('dailio_user');
    this.notify();
  }

  onAuthStateChanged(callback: (user: User | null) => void, _onError?: (error: unknown) => void) {
    this.listeners.push(callback);
    callback(this.user);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notify() {
    this.listeners.forEach(l => l(this.user));
  }
}
