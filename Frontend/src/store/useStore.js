import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const safeStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
    } catch (e) {
      console.warn('[useStore] localStorage.getItem bloqueado, usando estado inicial');
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch (e) {
      console.warn('[useStore] localStorage.setItem bloqueado');
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch (e) {
      console.warn('[useStore] localStorage.removeItem bloqueado');
    }
  },
};

export const useStore = create(
  persist(
    (set, get) => ({
      theme: 'light',
      toggleTheme: () => {
        const nextTheme = get().theme === 'light' ? 'dark' : 'light';
        set({ theme: nextTheme });
        document.documentElement.setAttribute('data-theme', nextTheme);
      },
      setTheme: (theme) => {
        set({ theme });
        document.documentElement.setAttribute('data-theme', theme);
      },

      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      currentUser: null,
      setCurrentUser: (user) => set({ currentUser: user }),

      isAuthenticated: false,
      login: (user) => {
        set({ currentUser: user, isAuthenticated: true });
        document.body.classList.add('logged-in');
      },
      logout: () => {
        set({ currentUser: null, isAuthenticated: false });
        document.body.classList.remove('logged-in');
      },

      notifications: [],
      unreadCount: 0,
      setNotifications: (list) => set({ notifications: list, unreadCount: list.filter(n => !n.is_read).length }),
      addNotification: (notification) => set((state) => ({
        notifications: [notification, ...state.notifications],
        unreadCount: state.unreadCount + 1,
      })),
      markAsRead: (id) => set((state) => {
        const updated = state.notifications.map(n => n.id === id ? { ...n, is_read: true } : n);
        return { notifications: updated, unreadCount: updated.filter(n => !n.is_read).length };
      }),
    }),
    {
      name: 'antigravity-storage',
      storage: createJSONStorage(() => safeStorage),
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state && state.theme) {
          document.documentElement.setAttribute('data-theme', state.theme);
        }
        if (state && state.isAuthenticated) {
          document.body.classList.add('logged-in');
        }
      },
    }
  )
);