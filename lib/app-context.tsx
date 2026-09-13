"use client";

import * as React from "react";
import { analyzeAllRegions } from "./vulnerability-logic";
import type { RegionAnalysis, RegionRawInput } from "./types";

interface AppState {
  regions: RegionAnalysis[];
  selectedCode: string | null;
  isBuiltInDataset: boolean;
  fileName: string | null;
  warnings: string[];
}

interface AppContextValue extends AppState {
  loadRows: (rows: RegionRawInput[], source: { isBuiltIn: boolean; fileName: string | null }) => void;
  selectRegion: (code: string | null) => void;
  clearData: () => void;
  setWarnings: (warnings: string[]) => void;
  selectedRegion: RegionAnalysis | null;
}

const AppContext = React.createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AppState>({
    regions: [],
    selectedCode: null,
    isBuiltInDataset: false,
    fileName: null,
    warnings: [],
  });

  const loadRows = React.useCallback(
    (rows: RegionRawInput[], source: { isBuiltIn: boolean; fileName: string | null }) => {
      const analyzed = analyzeAllRegions(rows);
      setState((prev) => ({
        ...prev,
        regions: analyzed,
        isBuiltInDataset: source.isBuiltIn,
        fileName: source.fileName,
        selectedCode: analyzed.length > 0 ? analyzed[0].sigunguCode : null,
      }));
    },
    []
  );

  const selectRegion = React.useCallback((code: string | null) => {
    setState((prev) => ({ ...prev, selectedCode: code }));
  }, []);

  const clearData = React.useCallback(() => {
    setState({ regions: [], selectedCode: null, isBuiltInDataset: false, fileName: null, warnings: [] });
  }, []);

  const setWarnings = React.useCallback((warnings: string[]) => {
    setState((prev) => ({ ...prev, warnings }));
  }, []);

  const selectedRegion = React.useMemo(
    () => state.regions.find((r) => r.sigunguCode === state.selectedCode) ?? null,
    [state.regions, state.selectedCode]
  );

  const value: AppContextValue = {
    ...state,
    loadRows,
    selectRegion,
    clearData,
    setWarnings,
    selectedRegion,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextValue {
  const ctx = React.useContext(AppContext);
  if (!ctx) throw new Error("useAppContext는 AppProvider 내부에서만 사용할 수 있습니다.");
  return ctx;
}
