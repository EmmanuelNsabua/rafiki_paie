'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formaterMontant, libelleOperation, formaterDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { History, Lock, Clock, Search, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function HistoriqueDePaiePage() {
  const router = useRouter();
  const [anneeFiltre, setAnneeFiltre] = React.useState<number | null>(null);
  const [statutFiltre, setStatutFiltre] = React.useState<'tous' | 'en_cours' | 'terminee'>('tous');
  const [recherche, setRecherche] = React.useState('');

  const { data: operations = [], isLoading } = useQuery({
    queryKey: ['operations'],
    queryFn: () => api.operations.lister(),
  });

  // Toutes les années depuis le début
  const annees = React.useMemo(() => {
    const setAnnees = new Set<number>();
    operations.forEach((op) => setAnnees.add(op.annee));
    return Array.from(setAnnees).sort((a, b) => b - a);
  }, [operations]);

  const operationsFiltrees = React.useMemo(() => {
    return operations.filter((op) => {
      if (anneeFiltre !== null && op.annee !== anneeFiltre) return false;
      if (statutFiltre !== 'tous' && op.statut !== statutFiltre) return false;
      if (recherche.trim()) {
        const query = recherche.toLowerCase();
        const libelle = libelleOperation(op.annee, op.mois).toLowerCase();
        if (!libelle.includes(query) && !String(op.annee).includes(query)) return false;
      }
      return true;
    });
  }, [operations, anneeFiltre, statutFiltre, recherche]);

  return (
    <div className="space-y-[1.143rem] pb-[2.857rem]">
      {/* 1. Carte d'en-tête */}
      <div className="min-h-[4.571rem] bg-[var(--surface)] rounded-[0.571rem] p-[1.143rem] flex flex-col sm:flex-row sm:items-center justify-between gap-[0.857rem] border border-[var(--border)] shadow-xs">
        <div>
          <h1 className="text-[1.714rem] font-bold text-[var(--text)] tracking-tight leading-[2.286rem] flex items-center gap-[0.571rem]">
            <History className="w-[1.714rem] h-[1.714rem] text-[var(--text-2)]" />
            <span>Historique de paie</span>
          </h1>
          <p className="text-[0.857rem] text-[var(--text-2)] mt-[0.286rem]">
            Toutes les opérations mensuelles enregistrées depuis l’origine.
          </p>
        </div>

        {/* Barre de recherche rapide */}
        <div className="relative w-full sm:w-[15rem]">
          <Search className="w-[1rem] h-[1rem] absolute left-[0.714rem] top-1/2 -translate-y-1/2 text-[var(--text-2)] pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher un mois, année…"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            className="w-full h-[2.286rem] pl-[2.286rem] pr-[0.714rem] rounded-[0.429rem] bg-[var(--page)] border border-[var(--border)] text-[0.857rem] text-[var(--text)] outline-none focus:border-[var(--primary)] transition-colors"
          />
        </div>
      </div>

      {/* 2. Filtres avancés */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[0.571rem] p-[0.857rem] flex flex-wrap items-center justify-between gap-[0.857rem] shadow-xs">
        {/* Années (toutes disponibles) */}
        <div className="flex flex-wrap items-center gap-[0.429rem]">
          <span className="text-[0.857rem] font-medium text-[var(--text-2)] mr-[0.286rem]">
            Année :
          </span>
          <button
            type="button"
            onClick={() => setAnneeFiltre(null)}
            className={cn(
              'h-[1.857rem] px-[0.714rem] rounded-full text-[0.857rem] font-medium transition-colors cursor-pointer',
              anneeFiltre === null
                ? 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-xs'
                : 'bg-[var(--hover)] text-[var(--text-2)] hover:text-[var(--text)]'
            )}
          >
            Toutes ({operations.length})
          </button>
          {annees.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAnneeFiltre(a)}
              className={cn(
                'h-[1.857rem] px-[0.714rem] rounded-full text-[0.857rem] font-medium transition-colors cursor-pointer',
                anneeFiltre === a
                  ? 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-xs'
                  : 'bg-[var(--hover)] text-[var(--text-2)] hover:text-[var(--text)]'
              )}
            >
              {a}
            </button>
          ))}
        </div>

        {/* Statut */}
        <div className="flex items-center gap-[0.286rem] bg-[var(--hover)] p-[0.143rem] rounded-full border border-[var(--border)]">
          <button
            type="button"
            onClick={() => setStatutFiltre('tous')}
            className={cn(
              'px-[0.714rem] py-[0.143rem] rounded-full text-[0.786rem] font-medium transition-colors cursor-pointer',
              statutFiltre === 'tous'
                ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs font-semibold'
                : 'text-[var(--text-2)] hover:text-[var(--text)]'
            )}
          >
            Tous
          </button>
          <button
            type="button"
            onClick={() => setStatutFiltre('terminee')}
            className={cn(
              'px-[0.714rem] py-[0.143rem] rounded-full text-[0.786rem] font-medium transition-colors cursor-pointer',
              statutFiltre === 'terminee'
                ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs font-semibold'
                : 'text-[var(--text-2)] hover:text-[var(--text)]'
            )}
          >
            Terminées
          </button>
          <button
            type="button"
            onClick={() => setStatutFiltre('en_cours')}
            className={cn(
              'px-[0.714rem] py-[0.143rem] rounded-full text-[0.786rem] font-medium transition-colors cursor-pointer',
              statutFiltre === 'en_cours'
                ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs font-semibold'
                : 'text-[var(--text-2)] hover:text-[var(--text)]'
            )}
          >
            En cours
          </button>
        </div>
      </div>

      {/* 3. Carte de tableau */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[0.571rem] overflow-hidden shadow-xs">
        <div className="h-[3.143rem] px-[1.143rem] flex items-center justify-between border-b border-[var(--border)]">
          <h2 className="text-[1.143rem] font-semibold text-[var(--text)]">Opérations archivées</h2>
          <span className="text-[0.857rem] text-[var(--text-2)]">
            {operationsFiltrees.length} opération{operationsFiltrees.length > 1 ? 's' : ''} trouvée
            {operationsFiltrees.length > 1 ? 's' : ''}
          </span>
        </div>

        {isLoading ? (
          <div className="p-[2.857rem] text-center text-[var(--text-2)]">
            Chargement de l’historique…
          </div>
        ) : operationsFiltrees.length === 0 ? (
          <div className="p-[2.857rem] text-center text-[var(--text-2)]">
            Aucune opération ne correspond aux critères sélectionnés.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="h-[2.571rem] bg-[var(--table-head)]">
                  <TableHead className="w-[14rem] pl-[1.143rem]">Période</TableHead>
                  <TableHead className="w-[10rem]">Statut</TableHead>
                  <TableHead className="text-right w-[11rem]">Effectif</TableHead>
                  <TableHead className="text-right w-[12rem]">Total viré banque</TableHead>
                  <TableHead className="text-right w-[12rem]">Dernière mise à jour</TableHead>
                  <TableHead className="text-center w-[9rem] pr-[1.143rem]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {operationsFiltrees.map((op) => {
                  const estTerminee = op.statut === 'terminee';
                  return (
                    <TableRow
                      key={op.id}
                      onClick={() => router.push(`/operation/?id=${op.id}`)}
                      className="cursor-pointer hover:bg-[var(--hover)] h-[3.429rem] transition-colors"
                    >
                      {/* Période */}
                      <TableCell className="font-semibold text-[var(--text)] pl-[1.143rem]">
                        {libelleOperation(op.annee, op.mois)}
                      </TableCell>

                      {/* Statut */}
                      <TableCell>
                        {estTerminee ? (
                          <Badge variant="outline" className="gap-[0.286rem]">
                            <Lock className="w-[0.857rem] h-[0.857rem]" />
                            <span>Terminée</span>
                          </Badge>
                        ) : (
                          <Badge variant="default" className="gap-[0.286rem]">
                            <Clock className="w-[0.857rem] h-[0.857rem]" />
                            <span>En cours</span>
                          </Badge>
                        )}
                      </TableCell>

                      {/* Effectif */}
                      <TableCell className="text-right font-medium text-[var(--text)]">
                        {op.nombre_employes} employé{op.nombre_employes > 1 ? 's' : ''}
                      </TableCell>

                      {/* Total payé */}
                      <TableCell className="text-right font-mono tabular-nums font-semibold text-[var(--text)]">
                        {formaterMontant(op.total_paye, 0)}
                      </TableCell>

                      {/* Dernière mise à jour */}
                      <TableCell className="text-right text-[var(--text-2)] text-[0.857rem]">
                        {formaterDate(new Date(op.mis_a_jour_le))}
                      </TableCell>

                      {/* Action */}
                      <TableCell
                        className="text-center pr-[1.143rem]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/operation/?id=${op.id}`)}
                          className="h-[2rem] px-[0.714rem] text-[0.857rem] font-medium flex items-center gap-[0.286rem] mx-auto hover:bg-[var(--hover)]"
                        >
                          <span>Consulter</span>
                          <ArrowRight className="w-[0.857rem] h-[0.857rem]" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
