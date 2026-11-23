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
      <div className="min-h-screen bg-[var(--page)] flex items-center justify-center p-[1.429rem]">
        <div className="max-w-[32rem] w-full bg-[var(--surface)] p-[1.714rem] rounded-[0.571rem] border border-[var(--border)] shadow-xl text-center">
          <div className="w-[3.429rem] h-[3.429rem] rounded-full bg-[var(--warning-tint)] text-[var(--warning-text)] flex items-center justify-center mx-auto mb-[0.857rem]">
            <ShieldAlert className="w-[1.714rem] h-[1.714rem]" />
          </div>
          <h2 className="text-[1.429rem] font-bold text-[var(--text)] mb-[0.571rem]">
            Application de bureau requise
          </h2>
          <p className="text-[1rem] text-[var(--text-2)] leading-relaxed mb-[1.143rem]">
            Cette page doit être ouverte dans l’application Paie Rafiki. Elle s’exécute localement
            avec une base de données sécurisée SQLite.
          </p>
          <div className="text-[0.857rem] text-[var(--text-2)] bg-[var(--hover)] p-[0.714rem] rounded-[0.429rem]">
            L’API locale sécurisée (<code className="font-mono">window.api</code>) est introuvable
            dans ce navigateur.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--page)] text-[var(--text)] flex">
      {/* Barre latérale fixe (232px = 16.571rem) */}
      <Sidebar />

      {/* Colonne droite */}
      <div className="flex-1 ml-[16.571rem] flex flex-col min-h-screen">
        {/* Barre du haut fixe (52px = 3.714rem) */}
        <Topbar />

        {/* Zone de contenu principale (hauteur barre du haut 52px = 3.714rem, marges 20px = 1.429rem) */}
        <main className="mt-[3.714rem] p-[1.429rem] flex-1 overflow-x-hidden">
          <div className="max-w-[96.125rem] mx-auto w-full">{children}</div>
        </main>
      </div>

      <Toaster />
    </div>
  );
}
