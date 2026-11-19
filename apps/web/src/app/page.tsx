'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Window declaration for Electron IPC API
declare global {
  interface Window {
    api?: {
      pingDb: () => Promise<{ success: boolean; sqlite_version: string }>;
    };
  }
}

export default function HomePage() {
  const [dbStatus, setDbStatus] = React.useState<string>('Vérification...');
  const [testMontant, setTestMontant] = React.useState<string>('500');

  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.api?.pingDb) {
      window.api.pingDb().then(
        (res) => setDbStatus(`Connecté à SQLite v${res.sqlite_version}`),
        (err) => setDbStatus(`Erreur SQLite : ${err?.message || err}`)
      );
    } else {
      setDbStatus('Mode Web / Navigateur (IPC non actif)');
    }
  }, []);

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-8">
      <header className="border-b border-[var(--border)] pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
            Paie Rafiki — Phase 0
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Fondations techniques validées : Next.js, Tailwind, shadcn/ui & Electron
          </p>
        </div>
        <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-[var(--primary)] text-[var(--primary-foreground)]">
          {dbStatus}
        </span>
      </header>

      {/* Variables de thème (Section 8) */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-4 shadow-sm">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">
          Palette de thèmes (Section 8)
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--background)] text-center">
            <span className="text-xs text-[var(--muted-foreground)] block">Fond</span>
            <span className="text-xs font-mono font-bold">--background</span>
          </div>
          <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--card)] text-center">
            <span className="text-xs text-[var(--muted-foreground)] block">Surface</span>
            <span className="text-xs font-mono font-bold">--card</span>
          </div>
          <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--card)] text-center">
            <span className="text-xs text-[var(--muted-foreground)] block">Texte</span>
            <span className="text-xs font-mono font-bold text-[var(--foreground)]">
              --foreground
            </span>
          </div>
          <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--card)] text-center">
            <span className="text-xs text-[var(--muted-foreground)] block">Secondaire</span>
            <span className="text-xs font-mono text-[var(--muted-foreground)]">--muted</span>
          </div>
          <div className="p-3 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] text-center">
            <span className="text-xs opacity-80 block">Accent</span>
            <span className="text-xs font-mono font-bold">--primary</span>
          </div>
          <div className="p-3 rounded-xl bg-[var(--destructive)] text-[var(--destructive-foreground)] text-center">
            <span className="text-xs opacity-80 block">Danger</span>
            <span className="text-xs font-mono font-bold">--destructive</span>
          </div>
        </div>
      </section>

      {/* Composants shadcn/ui */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-4 shadow-sm">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">
          Composants shadcn/ui de démonstration
        </h2>
        <div className="flex flex-wrap gap-4 items-center">
          <Input
            value={testMontant}
            onChange={(e) => setTestMontant(e.target.value)}
            className="w-48"
            placeholder="Salaire en $"
          />
          <Button variant="default">Action principale</Button>
          <Button variant="secondary">Bouton secondaire</Button>
          <Button variant="destructive">Retrait</Button>
        </div>

        <div className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Composant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Valeur test</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Moteur de calcul</TableCell>
                <TableCell>Prêt (vecteurs validés)</TableCell>
                <TableCell className="text-right">{testMontant} $</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Base locale SQLite</TableCell>
                <TableCell>{dbStatus}</TableCell>
                <TableCell className="text-right">better-sqlite3</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </section>
    </main>
  );
}
