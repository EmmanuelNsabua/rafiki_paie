'use client';

import * as React from 'react';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { Toaster } from '@/components/ui/sonner';
import { estDansElectron } from '@/lib/api';
import { ShieldAlert } from 'lucide-react';

export function Shell({ children }: { children: React.ReactNode }) {
  const [estMonte, setEstMonte] = React.useState(false);
  const [dansElectron, setDansElectron] = React.useState(true);

  React.useEffect(() => {
    setEstMonte(true);
    setDansElectron(estDansElectron());
  }, []);

  if (!estMonte) {
    return (
      <div className="min-h-screen bg-[var(--page)] flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-[var(--primary)] border-t-transparent animate-spin" />
      </div>
    );
  }

  // Écran d'avertissement sans window.api (Section 4)
  if (!dansElectron) {
    return (
      <div className="min-h-screen bg-[var(--page)] flex items-center justify-center p-6">
        <div className="max-w-xl w-full bg-[var(--surface)] p-8 rounded-[12px] border border-[var(--border)] shadow-xl text-center">
          <div className="w-16 h-16 rounded-full bg-[var(--warning-tint)] text-[var(--warning-text)] flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-[1.75rem] font-bold text-[var(--text)] mb-3">
            Application de bureau requise
          </h2>
          <p className="text-[1.125rem] text-[var(--text-2)] leading-relaxed mb-6">
            Cette page doit être ouverte dans l’application Paie Rafiki.
            Elle s’exécute localement avec une base de données sécurisée SQLite.
          </p>
          <div className="text-[0.875rem] text-[var(--text-2)] bg-[var(--hover)] p-3 rounded-[6px]">
            L’API locale sécurisée (<code className="font-mono">window.api</code>) est introuvable dans ce navigateur.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--page)] text-[var(--text)] flex">
      {/* Barre latérale fixe */}
      <Sidebar />

      {/* Colonne droite */}
      <div className="flex-1 ml-[20.875rem] flex flex-col min-h-screen">
        {/* Barre du haut fixe */}
        <Topbar />

        {/* Zone de contenu principale (y 94px = 5.875rem, marges 24px = 1.5rem) */}
        <main className="mt-[5.875rem] p-[1.5rem] flex-1 overflow-x-hidden">
          <div className="max-w-[96.125rem] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      <Toaster />
    </div>
  );
}
