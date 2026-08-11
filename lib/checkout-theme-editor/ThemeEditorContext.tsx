"use client";

import React, { createContext, useContext, useReducer } from "react";
import {
  CheckoutThemeEditorAction,
  CheckoutThemeEditorState,
  INITIAL_THEME_EDITOR_STATE,
  themeEditorReducer,
} from "./themeReducer";

interface ThemeEditorContextValue {
  state: CheckoutThemeEditorState;
  dispatch: React.Dispatch<CheckoutThemeEditorAction>;
}

const ThemeEditorContext = createContext<ThemeEditorContextValue | undefined>(undefined);

export function ThemeEditorProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(themeEditorReducer, INITIAL_THEME_EDITOR_STATE);
  return <ThemeEditorContext.Provider value={{ state, dispatch }}>{children}</ThemeEditorContext.Provider>;
}

export function useThemeEditor() {
  const ctx = useContext(ThemeEditorContext);
  if (!ctx) throw new Error("useThemeEditor must be used within ThemeEditorProvider");
  return ctx;
}
