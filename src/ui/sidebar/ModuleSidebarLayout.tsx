'use client';
import { useSidebar } from '@/ui/sidebar/SidebarProvider';
import React, { useEffect } from 'react';

export function ModuleSidebarLayout({
  sidebar,
  title,
  children,
}: {
  sidebar: React.ReactNode;
  title?: string;
  children: React.ReactNode;
}) {
  const { setSidebar, setTitle } = useSidebar();

  useEffect(() => {
    setSidebar(sidebar);
    setTitle(title);
    return () => {
      setSidebar(null);
      setTitle(undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
