import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const DRAWER_WIDTH = 520;

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
      },
      logout: () => {
        set({ currentUser: null, isAuthenticated: false });
      },

      landingDrawers: {
        feature: { isOpen: false, drawerWidth: DRAWER_WIDTH },
        benefit: { isOpen: false, drawerWidth: DRAWER_WIDTH },
      },
      openFeatureDrawer: () => set((state) => ({
        landingDrawers: {
          ...state.landingDrawers,
          feature: { ...state.landingDrawers.feature, isOpen: true },
        },
      })),
      closeFeatureDrawer: () => set((state) => ({
        landingDrawers: {
          ...state.landingDrawers,
          feature: { ...state.landingDrawers.feature, isOpen: false },
        },
      })),
      openBenefitDrawer: () => set((state) => ({
        landingDrawers: {
          ...state.landingDrawers,
          benefit: { ...state.landingDrawers.benefit, isOpen: true },
        },
      })),
      closeBenefitDrawer: () => set((state) => ({
        landingDrawers: {
          ...state.landingDrawers,
          benefit: { ...state.landingDrawers.benefit, isOpen: false },
        },
      })),
      closeAllLandingDrawers: () => set((state) => ({
        landingDrawers: {
          feature: { ...state.landingDrawers.feature, isOpen: false },
          benefit: { ...state.landingDrawers.benefit, isOpen: false },
        },
      })),

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
      },
    }
  )
);