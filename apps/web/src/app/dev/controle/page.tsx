'use client';

import * as React from 'react';
import type { ResumeOperationLister, DetailOperationComplet, Journal } from '@rafiki/contrat';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function PageControleDev() {
  const [estDev, setEstDev] = React.useState<boolean | null>(null);
  const [operations, setOperations] = React.useState<ResumeOperationLister[]>([]);
  const [operationSelectionnee, setOperationSelectionnee] =
    React.useState<DetailOperationComplet | null>(null);
  const [journal, setJournal] = React.useState<Journal[]>([]);
  const [chargement, setChargement] = React.useState<boolean>(true);
  const [erreur, setErreur] = React.useState<string | null>(null);
  const [succes, setSucces] = React.useState<string | null>(null);

  // Vérification de l'environnement de développement
  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const dev = Boolean(window.api?.env?.estDev);
    setEstDev(dev);

    if (dev) {
      chargerDonnees();
    } else {
      setChargement(false);
    }
  }, []);

  async function chargerDonnees(idSelectionnee?: string) {
    if (!window.api) return;
    setChargement(true);
    setErreur(null);

    try {
      // 1. Lister les opérations
      const resOps = await window.api.operations.lister();
      if (!resOps.ok) {
        setErreur(resOps.erreur.message);
        setChargement(false);
        return;
      }
      setOperations(resOps.data);

      // Si une opération était sélectionnée, la recharger
      const cibleId = idSelectionnee || operationSelectionnee?.operation.id || resOps.data[0]?.id;
      if (cibleId) {
        await chargerDetailOperation(cibleId);
      }

      // 2. Charger le journal
      const resJournal = await window.api.journal.lister({ limite: 30 });
      if (resJournal.ok) {
        setJournal(resJournal.data);
      }
    } catch (err: any) {
      setErreur(err?.message || 'Erreur inconnue lors du chargement des données.');
    } finally {
      setChargement(false);
    }
  }

  async function chargerDetailOperation(id: string) {
    if (!window.api) return;
    try {
      const res = await window.api.operations.obtenir({ id });
      if (res.ok) {
        setOperationSelectionnee(res.data);
      } else {
        setErreur(res.erreur.message);
      }
    } catch (err: any) {
      setErreur(err?.message || 'Erreur lors du chargement du détail de l opération.');
    }
  }

  async function terminerOperation(id: string) {
    if (!window.api) return;
    setErreur(null);
    setSucces(null);
    try {
      const res = await window.api.operations.terminer({ id });
      if (res.ok) {
        setSucces(`Opération clôturée avec succès.`);
        await chargerDonnees(id);
      } else {
        setErreur(res.erreur.message);
      }
    } catch (err: any) {
      setErreur(err?.message || 'Erreur lors de la clôture.');
    }
  }

  async function rouvrirOperation(id: string) {
    if (!window.api) return;
    setErreur(null);
    setSucces(null);
    try {
      const res = await window.api.operations.rouvrir({ id });
      if (res.ok) {
        setSucces(`Opération rouverte avec succès.`);
        await chargerDonnees(id);
      } else {
        setErreur(res.erreur.message);
      }
    } catch (err: any) {
      setErreur(err?.message || 'Erreur lors de la réouverture.');
    }
  }

  if (estDev === null) {
    return (
      <main className="p-8 max-w-7xl mx-auto">
        <p className="text-sm text-neutral-500">Vérification de l environnement...</p>
      </main>
    );
  }

  if (!estDev) {
    return (
      <main className="p-8 max-w-7xl mx-auto space-y-4">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-900">
          <h1 className="text-xl font-bold">Accès refusé</h1>
          <p className="text-sm mt-1">
            Cette page de contrôle interne est strictement réservée au mode développement (
            <code className="bg-red-100 px-1 py-0.5 rounded font-mono">
              window.api.env.estDev === true
            </code>
            ).
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="p-6 max-w-7xl mx-auto space-y-8">
      {/* En-tête */}
      <header className="border-b pb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Page de Contrôle</h1>
            <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-amber-300">
              Dev Only
            </span>
          </div>
          <p className="text-sm text-neutral-500 mt-1">
            Vérification du pont IPC, des calculs de paie et du journal d audit SQLite.
          </p>
        </div>
        <Button onClick={() => chargerDonnees()} variant="outline" size="sm">
          Rafraîchir
        </Button>
      </header>

      {/* Messages d'état */}
      {erreur && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
          <strong>Erreur : </strong> {erreur}
        </div>
      )}
      {succes && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
          <strong>Succès : </strong> {succes}
        </div>
      )}

      {/* Section 1 : Liste des Opérations */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">1. Opérations de paie</h2>
        <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-neutral-50">
                <TableHead>Période</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Total à virer (USD)</TableHead>
                <TableHead className="text-center">Employés</TableHead>
                <TableHead>Clôturée le</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {operations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-neutral-400">
                    Aucune opération de paie enregistrée.
                  </TableCell>
                </TableRow>
              ) : (
                operations.map((op) => (
                  <TableRow
                    key={op.id}
                    className={operationSelectionnee?.operation.id === op.id ? 'bg-blue-50/60' : ''}
                  >
                    <TableCell className="font-semibold">
                      {op.mois.toString().padStart(2, '0')}/{op.annee}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                          op.statut === 'terminee'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {op.statut}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {op.total_virement} $
                    </TableCell>
                    <TableCell className="text-center">{op.nombre_employes}</TableCell>
                    <TableCell className="text-xs text-neutral-500">
                      {op.terminee_le ? new Date(op.terminee_le).toLocaleString('fr-FR') : '—'}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => chargerDetailOperation(op.id)}
                      >
                        Voir détail
                      </Button>
                      {op.statut === 'ouverte' ? (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => terminerOperation(op.id)}
                        >
                          Terminer
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => rouvrirOperation(op.id)}
                        >
                          Rouvrir
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Section 2 : Détail de l'opération sélectionnée */}
      {operationSelectionnee && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">
              2. Détail de la paie :{' '}
              {operationSelectionnee.operation.mois.toString().padStart(2, '0')}/
              {operationSelectionnee.operation.annee}
            </h2>
            <span className="text-xs text-neutral-400 font-mono">
              ID: {operationSelectionnee.operation.id}
            </span>
          </div>

          {/* Synthèse Totaux */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="p-4 rounded-xl border bg-white">
              <span className="text-xs text-neutral-500 block">Total virement</span>
              <span className="text-xl font-bold font-mono text-emerald-700">
                {operationSelectionnee.totaux.total_virement} $
              </span>
            </div>
            <div className="p-4 rounded-xl border bg-white">
              <span className="text-xs text-neutral-500 block">Total net global</span>
              <span className="text-xl font-bold font-mono text-neutral-800">
                {operationSelectionnee.totaux.total_net_global} $
              </span>
            </div>
            <div className="p-4 rounded-xl border bg-white">
              <span className="text-xs text-neutral-500 block">Écart d arrondi</span>
              <span className="text-xl font-bold font-mono text-blue-700">
                {operationSelectionnee.totaux.ecart_arrondi} $
              </span>
            </div>
            <div className="p-4 rounded-xl border bg-white">
              <span className="text-xs text-neutral-500 block">Employés</span>
              <span className="text-xl font-bold text-neutral-800">
                {operationSelectionnee.totaux.nombre_employes}
              </span>
            </div>
            <div className="p-4 rounded-xl border bg-white">
              <span className="text-xs text-neutral-500 block">Sans téléphone</span>
              <span
                className={`text-xl font-bold ${
                  operationSelectionnee.totaux.nombre_sans_telephone > 0
                    ? 'text-amber-600'
                    : 'text-neutral-800'
                }`}
              >
                {operationSelectionnee.totaux.nombre_sans_telephone}
              </span>
            </div>
            <div className="p-4 rounded-xl border bg-white">
              <span className="text-xs text-neutral-500 block">Lignes en erreur</span>
              <span
                className={`text-xl font-bold ${
                  operationSelectionnee.totaux.nombre_lignes_erreur > 0
                    ? 'text-red-600'
                    : 'text-neutral-800'
                }`}
              >
                {operationSelectionnee.totaux.nombre_lignes_erreur}
              </span>
            </div>
          </div>

          {/* Lignes de paie */}
          <div className="rounded-lg border bg-white shadow-sm overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-neutral-50 text-xs">
                  <TableHead className="w-12">N°</TableHead>
                  <TableHead>Nom complet</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Banque</TableHead>
                  <TableHead className="text-right">Base</TableHead>
                  <TableHead className="text-right">HS</TableHead>
                  <TableHead className="text-right">Retrait</TableHead>
                  <TableHead className="text-center">J. Ouv</TableHead>
                  <TableHead className="text-center">Mal.</TableHead>
                  <TableHead className="text-center">Congé</TableHead>
                  <TableHead className="text-center">Abs.</TableHead>
                  <TableHead className="text-right">Net Global</TableHead>
                  <TableHead className="text-right">Virement</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {operationSelectionnee.lignes.map((l) => (
                  <TableRow key={l.id} className="text-xs font-mono">
                    <TableCell className="font-semibold">{l.numero}</TableCell>
                    <TableCell className="font-sans font-medium whitespace-nowrap">
                      {l.nom} {l.postnom} {l.prenom}
                    </TableCell>
                    <TableCell className="font-sans">
                      {l.telephone || <span className="text-amber-500 font-semibold">—</span>}
                    </TableCell>
                    <TableCell className="font-sans">
                      {l.code_banque || <span className="text-amber-500 font-semibold">—</span>}
                    </TableCell>
                    <TableCell className="text-right">{l.salaire_base} $</TableCell>
                    <TableCell className="text-right">{l.hs} $</TableCell>
                    <TableCell className="text-right">{l.retrait} $</TableCell>
                    <TableCell className="text-center">{l.jours_ouvrables}</TableCell>
                    <TableCell className="text-center">{l.jours_maladie}</TableCell>
                    <TableCell className="text-center">{l.jours_conge}</TableCell>
                    <TableCell className="text-center">{l.jours_absence}</TableCell>
                    <TableCell className="text-right font-bold text-neutral-800">
                      {l.net_global ?? '—'} $
                    </TableCell>
                    <TableCell className="text-right font-bold text-emerald-700">
                      {l.virement ?? '—'} $
                    </TableCell>
                    <TableCell className="font-sans">
                      {l.erreur ? (
                        <span className="text-red-600 font-bold">{l.erreur}</span>
                      ) : l.avertissement_net_negatif ? (
                        <span className="text-amber-600 font-semibold">Net négatif</span>
                      ) : (
                        <span className="text-emerald-600">Valide</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {/* Section 3 : Journal d'audit */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">
          3. Journal d audit (Dernières entrées)
        </h2>
        <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-neutral-50 text-xs">
                <TableHead className="w-40">Date / Heure</TableHead>
                <TableHead className="w-48">Action</TableHead>
                <TableHead className="w-36">Entité</TableHead>
                <TableHead>Détail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {journal.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-neutral-400 text-sm">
                    Aucun événement dans le journal.
                  </TableCell>
                </TableRow>
              ) : (
                journal.map((j) => (
                  <TableRow key={j.id} className="text-xs">
                    <TableCell className="font-mono text-neutral-500 whitespace-nowrap">
                      {new Date(j.horodatage).toLocaleString('fr-FR')}
                    </TableCell>
                    <TableCell>
                      <span className="bg-neutral-100 font-mono text-[11px] px-2 py-0.5 rounded font-semibold text-neutral-800">
                        {j.action}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-neutral-600">{j.entite}</TableCell>
                    <TableCell className="font-sans text-neutral-700">{j.detail}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </main>
  );
}
