import { create } from "zustand";

interface InboxFilterState {
  fit: "ALL" | "A" | "AB";
  source: string;
  remoteOnly: boolean;
  compatibleOnly: boolean;
  search: string;
  freshness: string;
  setFit: (fit: InboxFilterState["fit"]) => void;
  setSource: (source: string) => void;
  setRemoteOnly: (remoteOnly: boolean) => void;
  setCompatibleOnly: (compatibleOnly: boolean) => void;
  setSearch: (search: string) => void;
  setFreshness: (freshness: string) => void;
}

export const useInboxFilters = create<InboxFilterState>((set) => ({
  // Show compatible vacancies on first open. Users can narrow to A/B after
  // seeing the available market; an empty default inbox looks like a broken search.
  fit: "ALL",
  source: "ALL",
  remoteOnly: false,
  compatibleOnly: true,
  search: "",
  freshness: "ANY",
  setFit: (fit) => set({ fit }),
  setSource: (source) => set({ source }),
  setRemoteOnly: (remoteOnly) => set({ remoteOnly }),
  setCompatibleOnly: (compatibleOnly) => set({ compatibleOnly }),
  setSearch: (search) => set({ search }),
  setFreshness: (freshness) => set({ freshness }),
}));
