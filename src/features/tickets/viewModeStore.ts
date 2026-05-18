import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { safeStorage } from "@/lib/safeStorage";

export type ViewMode = "table" | "cards" | "kanban";

interface ViewModeState {
  mode: ViewMode;
  setMode: (mode: ViewMode) => void;
}

export const useTicketsView = create<ViewModeState>()(
  persist(
    (set) => ({
      mode: "table",
      setMode: (mode) => set({ mode }),
    }),
    { name: "zivy-tickets-view", storage: createJSONStorage(() => safeStorage) },
  ),
);
