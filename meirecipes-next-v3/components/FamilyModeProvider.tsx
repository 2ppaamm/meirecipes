"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface FamilyModeContextValue {
  enabled: boolean;
  toggle: () => void;
  setEnabled: (v: boolean) => void;
}

const Ctx = createContext<FamilyModeContextValue>({
  enabled: false,
  toggle: () => {},
  setEnabled: () => {},
});

const STORAGE_KEY = "mei-family-mode";

export function FamilyModeProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    try {
      const v = window.localStorage.getItem(STORAGE_KEY);
      if (v === "1") setEnabled(true);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
    } catch {
      /* ignore */
    }
    // Tag <body> so CSS can react globally
    if (typeof document !== "undefined") {
      document.body.dataset.familyMode = enabled ? "on" : "off";
    }
  }, [enabled]);

  return (
    <Ctx.Provider value={{ enabled, toggle: () => setEnabled((v) => !v), setEnabled }}>
      {children}
    </Ctx.Provider>
  );
}

export function useFamilyMode(): FamilyModeContextValue {
  return useContext(Ctx);
}
