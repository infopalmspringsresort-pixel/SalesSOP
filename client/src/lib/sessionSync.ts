// Cross-tab session synchronization using localStorage events
class SessionSync {
  private static instance: SessionSync;
  private listeners: Set<() => void> = new Set();
  
  static getInstance(): SessionSync {
    if (!SessionSync.instance) {
      SessionSync.instance = new SessionSync();
    }
    return SessionSync.instance;
  }

  constructor() {
    // Listen for storage events (cross-tab communication)
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.handleStorageChange.bind(this));
      
      // Also listen for focus events to check session status
      window.addEventListener('focus', this.checkSessionOnFocus.bind(this));
      
      // Listen for beforeunload to clean up
      window.addEventListener('beforeunload', this.cleanup.bind(this));
    }
  }

  // Notify all tabs that user logged out
  notifyLogout(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_event', JSON.stringify({
        type: 'logout',
        timestamp: Date.now()
      }));
      
      // Clear the event after a short delay to avoid interference
      setTimeout(() => {
        localStorage.removeItem('auth_event');
      }, 100);
    }
  }

  // Notify all tabs that user logged in
  notifyLogin(user: any): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_event', JSON.stringify({
        type: 'login',
        user,
        timestamp: Date.now()
      }));
      
      // Clear the event after a short delay
      setTimeout(() => {
        localStorage.removeItem('auth_event');
      }, 100);
    }
  }

  // Check session status when tab gains focus
  private async checkSessionOnFocus(): Promise<void> {
    try {
      const response = await fetch('/api/auth/user', {
        credentials: 'include'
      });
      
      if (response.status === 401) {
        // Session is invalid, trigger logout in this tab
        this.notifySessionInvalid();
      }
    } catch (error) {
      }
  }

  // Handle storage events from other tabs
  private handleStorageChange(event: StorageEvent): void {
    if (event.key === 'auth_event' && event.newValue) {
      try {
        const authEvent = JSON.parse(event.newValue);
        
        if (authEvent.type === 'logout') {
          // Another tab logged out, trigger logout in this tab
          this.triggerLogout();
        } else if (authEvent.type === 'login') {
          // Another tab logged in, refresh auth state
          this.triggerLogin(authEvent.user);
        } else if (authEvent.type === 'session_invalid') {
          // Session became invalid, logout this tab
          this.triggerLogout();
        }
      } catch (error) {
        }
    }
  }

  // Notify that session is invalid
  notifySessionInvalid(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_event', JSON.stringify({
        type: 'session_invalid',
        timestamp: Date.now()
      }));
      
      setTimeout(() => {
        localStorage.removeItem('auth_event');
      }, 100);
    }
  }

  // Register a listener for auth changes
  onAuthChange(callback: () => void): () => void {
    this.listeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  // Trigger logout in current tab
  private triggerLogout(): void {
    this.listeners.forEach(callback => callback());
  }

  // Trigger login refresh in current tab
  private triggerLogin(user: any): void {
    this.listeners.forEach(callback => callback());
  }

  // Cleanup listeners
  private cleanup(): void {
    this.listeners.clear();
  }
}

export const sessionSync = SessionSync.getInstance();