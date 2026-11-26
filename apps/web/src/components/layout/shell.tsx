'use client';

import * as React from 'react';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { BarreTitre } from './barre-titre';
import { Toaster, toast } from '@/components/ui/sonner';
import { api, estDansElectron } from '@/lib/api';
import { ShieldAlert } from 'lucide-react';

export function Shell({ children }: { children: React.ReactNode }) {
  const [estMonte, setEstMonte] = React.useState(false);
  const [dansElectron, setDansElectron] = React.useState(true);

  React.useEffect(() => {
    setEstMonte(true);
    setDansElectron(estDansElectron());
  }, []);

  // Gestionnaire de fermeture sans perte (Section 4.7)
  React.useEffect(() => {
    if (!estDansElectron()) return;

    const cleanup = api.fenetre.surAvantFermeture(async () => {
      // Clôture des saisies en attente (déclenche blur sur l'élément actif)
      if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      // Pause brève pour permettre le dispatch des événements change/blur React
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    return () => cleanup();
  }, []);

  // Écoute des notifications de mises à jour automatiques (Lot 2)
  React.useEffect(() => {
    if (!estDansElectron()) return;

    const cleanup = api.maj.surChangementEtat((info) => {
      if (info.statut === 'telecharge') {
        toast(`Starclip ${info.versionDisponible || ''} est prête.`, {
          description: 'La mise à jour a été téléchargée. Vous pouvez redémarrer pour l installer.',
          duration: Infinity,
          action: {
            label: 'Redémarrer et installer',
            onClick: () => {
              api.maj.installer().catch((err) => {
                console.error('Échec installation MAJ:', err);
              });
            },
          },
          cancel: {
            label: 'Plus tard',
            onClick: () => {},
          },
        });
      }
    });

    return () => cleanup();
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
    <div className="h-screen w-screen bg-[var(--page)] text-[var(--text)] overflow-hidden">
      {/* Barre de titre personnalisée (32px = 2.286rem) */}
      <BarreTitre />

      {/* Barre latérale fixe (232px = 16.571rem, décalée de 32px = 2.286rem) */}
      <Sidebar />

      {/* Barre du haut fixe (52px = 3.714rem, décalée de 32px = 2.286rem) */}
      <Topbar />

      {/* Zone de contenu principale scrollable indépendamment (32px + 52px = 84px = 6rem du haut) */}
      <main className="fixed left-[16.571rem] right-0 top-[6rem] bottom-0 overflow-y-auto overflow-x-hidden p-[1.429rem] custom-scrollbar">
        <div className="max-w-[96.125rem] mx-auto w-full pb-8">{children}</div>
      </main>

      <Toaster />
    </div>
  );
}
