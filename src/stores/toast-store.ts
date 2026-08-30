import { create } from "zustand";

export type ToastTone = "success" | "error" | "info";

export interface ToastMessage {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastState {
  items: ToastMessage[];
  push: (message: string, tone: ToastTone) => number;
  dismiss: (id: number) => void;
}

let nextToastId = 0;

export const useToastStore = create<ToastState>((set) => ({
  items: [],
  push: (message, tone) => {
    const id = ++nextToastId;
    set((state) => ({ items: [...state.items, { id, message, tone }].slice(-3) }));
    return id;
  },
  dismiss: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
}));

export const toast = {
  success: (message: string) => useToastStore.getState().push(message, "success"),
  error: (message: string) => useToastStore.getState().push(message, "error"),
  info: (message: string) => useToastStore.getState().push(message, "info"),
  dismiss: (id: number) => useToastStore.getState().dismiss(id),
};
