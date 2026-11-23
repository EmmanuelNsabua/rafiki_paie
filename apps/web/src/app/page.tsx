'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function RootPage() {
  const router = useRouter();

  React.useEffect(() => {
    // Vérification de démarrage et communication IPC
    if (typeof window !== 'undefined' && window.api?.pingDb) {
      console.log('[RENDERER] window.api est défini. Appel de window.api.pingDb()...');
      window.api.pingDb().then(
        (res) => {
          console.log('[RENDERER] Réponse reçue de db:ping. SQLite version:', res.sqlite_version);
        },
        (err) => {
          console.error('[RENDERER] Échec appel db:ping :', err?.message || err);
        }
      );
    }

    // Redirection vers /operation/ selon la spécification de la section 4
    router.replace('/operation/');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="flex items-center gap-3 text-[1.25rem] text-[var(--text-2)]">
        <div className="w-6 h-6 rounded-full border-3 border-[var(--primary)] border-t-transparent animate-spin" />
        <span>Chargement de l’application…</span>
      </div>
    </div>
  );
}
