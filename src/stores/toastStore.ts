import { create } from 'zustand';
import type { ToastMessage } from '../models';

export interface ToastStoreState {
  toasts: ToastMessage[];
  showToast: (message: string, type?: 'info' | 'success' | 'error') => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStoreState>((set) => ({
  toasts: [],

  removeToast: (id: string) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  showToast: (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);

    set((state) => {
      const filtered = state.toasts.filter((t) => t.message !== message);
      return {
        toasts: [...filtered, { id, message, type }],
      };
    });

    setTimeout(() => {
      useToastStore.getState().removeToast(id);
    }, 4000);
  },
}));
