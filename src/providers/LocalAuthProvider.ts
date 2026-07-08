import { AuthProvider, User } from '../types';

export class LocalAuthProvider implements AuthProvider {
  private user: User | null = null;
  private listeners: ((user: User | null) => void)[] = [];

  constructor() {
    const stored = localStorage.getItem('dailio_user');
    if (stored) {
      this.user = JSON.parse(stored);
    } else {
      // Default dev user
      this.user = { uid: 'dev-user', email: 'dev@dailio.app' };
      localStorage.setItem('dailio_user', JSON.stringify(this.user));
    }
  }

  getUser() {
    return this.user;
  }

  async signIn(email: string, _pass: string) {
    this.user = { uid: 'dev-user', email };
    localStorage.setItem('dailio_user', JSON.stringify(this.user));
    this.notify();
  }

  async signUp(email: string, _pass: string) {
    this.user = { uid: 'dev-user', email };
    localStorage.setItem('dailio_user', JSON.stringify(this.user));
    this.notify();
  }

  async signOut() {
    this.user = null;
    localStorage.removeItem('dailio_user');
    this.notify();
  }

  onAuthStateChanged(callback: (user: User | null) => void) {
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
