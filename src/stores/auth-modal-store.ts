"use client";

import { create } from "zustand";

type AuthModalView = "login" | "register";

interface AuthModalState {
  isOpen: boolean;
  view: AuthModalView;
}

interface AuthModalActions {
  openLogin: () => void;
  openRegister: () => void;
  close: () => void;
  setView: (view: AuthModalView) => void;
}

type AuthModalStore = AuthModalState & AuthModalActions;

export const useAuthModalStore = create<AuthModalStore>((set) => ({
  isOpen: false,
  view: "login",

  openLogin: () => set({ isOpen: true, view: "login" }),
  openRegister: () => set({ isOpen: true, view: "register" }),
  close: () => set({ isOpen: false }),
  setView: (view) => set({ view }),
}));
