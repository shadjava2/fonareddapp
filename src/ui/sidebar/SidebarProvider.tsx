'use client';
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

type SidebarNode = React.ReactNode | null;

type SidebarContextType = {
  sidebar: SidebarNode;
  setSidebar: (node: SidebarNode) => void;
  title?: string;
  setTitle: (t?: string) => void;
};

const SidebarContext = createContext<SidebarContextType | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [sidebar, _setSidebar] = useState<SidebarNode>(null);
  const [title, _setTitle] = useState<string | undefined>(undefined);

  const setSidebar = useCallback((node: SidebarNode) => _setSidebar(node), []);
  const setTitle = useCallback((t?: string) => _setTitle(t), []);

  const value = useMemo(
    () => ({ sidebar, setSidebar, title, setTitle }),
    [sidebar, setSidebar, title, setTitle]
  );

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar must be used within <SidebarProvider>');
  return ctx;
}

export function SidebarHost({ fallback }: { fallback: React.ReactNode }) {
  const { sidebar } = useSidebar();
  return <>{sidebar ?? fallback}</>;
}
