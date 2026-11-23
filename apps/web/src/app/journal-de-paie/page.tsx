'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  formaterMontant,
  formaterPourcentage,
  formaterDate,
  libelleOperation,
} from '@/lib/format';
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
import { DropdownMenu } from '@/components/ui/dropdown-menu';
import { AlertDialog } from '@/components/ui/alert-dialog';
import { DialogueNouvelleOperation } from '@/components/journal/dialogue-nouvelle-operation';
import { Plus, ArrowUpRight, ArrowDownRight, Minus, Lock, Clock } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

export default function JournalDePaiePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [dialogueOuvert, setDialogueOuvert] = React.useState(false);
  const [anneeFiltre, setAnneeFiltre] = React.useState<number | null>(null);
  const [opARouvrir, setOpARouvrir] = React.useState<string | null>(null);

  const { data: operations = [], isLoading } = useQuery({
    queryKey: ['operations'],
    queryFn: () => api.operations.lister(),
  });

  const mutationRouvrir = useMutation({
    mutationFn: (id: string) => api.operations.rouvrir({ id }),
    onSuccess: (op) => {
      queryClient.invalidateQueries({ queryKey: ['operations'] });
      toast.success(`La paie de ${libelleOperation(op.annee, op.mois)} a été rouverte.`);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Impossible de rouvrir la paie.');
    },
  });

  // Années disponibles dans les opérations
  const annees = React.useMemo(() => {
    const setAnnees = new Set<number>();
    operations.forEach((op) => setAnnees.add(op.annee));
    return Array.from(setAnnees).sort((a, b) => b - a);
  }, [operations]);

  React.useEffect(() => {
    if (annees.length > 0 && anneeFiltre === null) {
      setAnneeFiltre(annees[0]);
    }
  }, [annees, anneeFiltre]);

  const operationsFiltrees = React.useMemo(() => {
    if (anneeFiltre === null) return operations;
    return operations.filter((op) => op.annee === anneeFiltre);
  }, [operations, anneeFiltre]);

  return (
    <div className="space-y-6 pb-12">
      {/* Carte d'en-tête */}
      <div className="h-[6.875rem] bg-[var(--surface)] rounded-[12px] p-6 flex items-center justify-between shadow-xs">
        <h1 className="text-[2.75rem] font-semibold text-[var(--text)] tracking-tight leading-none">
          Journal de paie
        </h1>
        <Button
          onClick={() => setDialogueOuvert(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          <span>Nouvelle opération</span>
        </Button>
      </div>

      {/* Carte de tableau */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] overflow-hidden shadow-xs">
        {/* Bandeau de titre du tableau */}
        <div className="h-[4.4375rem] px-6 flex items-center justify-between border-b border-[var(--border)]">
          <h2 className="text-[1.625rem] font-semibold text-[var(--text)]">
            Opérations de paie
          </h2>
          <div className="flex items-center gap-4">
            <span className="text-[1.125rem] text-[var(--text-2)]">
              {operationsFiltrees.length} opération{operationsFiltrees.length > 1 ? 's' : ''} · Montants en dollars ($)
            </span>

            {/* Sélecteur d'année */}
            {annees.length > 0 && (
              <div className="flex items-center gap-1.5 bg-[var(--hover)] p-1 rounded-full border border-[var(--border)]">
                {annees.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAnneeFiltre(a)}
                    className={`px-3 py-1 rounded-full text-[0.9375rem] font-medium transition-colors cursor-pointer ${
                      anneeFiltre === a
                        ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs font-semibold'
                        : 'text-[var(--text-2)] hover:text-[var(--text)]'
                    }`}
                  >
                    {a}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setAnneeFiltre(null)}
                  className={`px-3 py-1 rounded-full text-[0.9375rem] font-medium transition-colors cursor-pointer ${
                    anneeFiltre === null
                      ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs font-semibold'
                      : 'text-[var(--text-2)] hover:text-[var(--text)]'
                  }`}
                >
                  Toutes
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Grille du tableau */}
        {isLoading ? (
          <div className="p-12 text-center text-[1.25rem] text-[var(--text-2)]">
            Chargement des opérations…
          </div>
        ) : operationsFiltrees.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-[1.25rem] font-medium text-[var(--text)]">
              Aucune opération enregistrée pour le moment.
            </p>
            <p className="text-[1.0625rem] text-[var(--text-2)]">
              Cliquez sur « Nouvelle opération » pour démarrer la paie du mois.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[18rem]">Période</TableHead>
                <TableHead className="w-[8rem] text-center">Employés</TableHead>
                <TableHead className="text-right w-[14rem]">Total payé ($)</TableHead>
                <TableHead className="w-[12rem] text-center">Variation</TableHead>
                <TableHead className="w-[14rem]">Terminée le</TableHead>
                <TableHead className="w-[10rem]">État</TableHead>
                <TableHead className="w-[6rem] text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {operationsFiltrees.map((op) => {
                const estTerminee = op.statut === 'terminee';
                const varTotal = op.variation;

                return (
                  <TableRow
                    key={op.id}
                    onClick={() => router.push(`/operation/?id=${op.id}`)}
                    className="cursor-pointer"
                  >
                    {/* Période */}
                    <TableCell>
                      <div className="font-medium text-[var(--text)]">
                        {libelleOperation(op.annee, op.mois)}
                      </div>
                      <div className="text-[0.9375rem] text-[var(--text-2)]">
                        {op.jours_ouvrables} jours ouvrables
                      </div>
                    </TableCell>

                    {/* Employés */}
                    <TableCell className="text-center font-medium">
                      {op.nombre_employes}
                    </TableCell>

                    {/* Total payé */}
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formaterMontant(op.total_paye || op.total_virement)}
                    </TableCell>

                    {/* Variation */}
                    <TableCell className="text-center">
                      {varTotal?.pourcentage ? (
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.875rem] font-semibold ${
                            varTotal.sens === 'hausse'
                              ? 'bg-[var(--primary-tint)] text-[var(--primary-strong)]'
                              : varTotal.sens === 'baisse'
                                ? 'bg-[var(--danger-tint)] text-[var(--danger)]'
                                : 'bg-[var(--hover)] text-[var(--text-2)]'
                          }`}
                        >
                          {varTotal.sens === 'hausse' && <ArrowUpRight className="w-3.5 h-3.5" />}
                          {varTotal.sens === 'baisse' && <ArrowDownRight className="w-3.5 h-3.5" />}
                          {varTotal.sens === 'stable' && <Minus className="w-3.5 h-3.5" />}
                          <span>{formaterPourcentage(varTotal.pourcentage)}</span>
                        </span>
                      ) : (
                        <span className="text-[var(--text-2)] text-[0.875rem]">—</span>
                      )}
                    </TableCell>

                    {/* Terminée le */}
                    <TableCell className="text-[var(--text-2)]">
                      {op.terminee_le ? formaterDate(op.terminee_le) : '—'}
                    </TableCell>

                    {/* État */}
                    <TableCell>
                      {estTerminee ? (
                        <Badge variant="secondary" className="gap-1.5">
                          <Lock className="w-3.5 h-3.5" />
                          <span>Terminée</span>
                        </Badge>
                      ) : (
                        <Badge variant="default" className="gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>En cours</span>
                        </Badge>
                      )}
                    </TableCell>

                    {/* Action */}
                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu
                        trigger={
                          <button
                            type="button"
                            className="w-[2.5rem] h-[2.5rem] rounded-[6px] border border-[var(--border)] bg-transparent hover:bg-[var(--hover)] flex items-center justify-center text-[var(--text)] cursor-pointer"
                            aria-label="Actions de l’opération"
                          >
                            ⋯
                          </button>
                        }
                        items={[
                          {
                            label: 'Ouvrir',
                            onClick: () => router.push(`/operation/?id=${op.id}`),
                          },
                          {
                            label: 'Bordereau de la banque',
                            disabled: true,
                            tooltip: 'Bientôt disponible',
                          },
                          ...(estTerminee
                            ? [
                                {
                                  label: 'Rouvrir la paie',
                                  onClick: () => setOpARouvrir(op.id),
                                },
                              ]
                            : []),
                        ]}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {/* Pied de tableau */}
        <div className="h-[2.8125rem] px-6 border-t border-[var(--border)] flex items-center text-[1.0625rem] text-[var(--text-2)]">
          Affichage de 1 à {operationsFiltrees.length} opération{operationsFiltrees.length > 1 ? 's' : ''}
        </div>
      </div>

      {/* Dialogue de création d'opération */}
      <DialogueNouvelleOperation
        ouvert={dialogueOuvert}
        onOpenChange={setDialogueOuvert}
      />

      {/* Dialogue de confirmation de réouverture */}
      <AlertDialog
        open={Boolean(opARouvrir)}
        onOpenChange={(open) => !open && setOpARouvrir(null)}
        title="Rouvrir cette opération de paie ?"
        description="Les montants figés seront recalculés et les lignes redeviendront modifiables."
        actionText="Rouvrir la paie"
        onAction={() => {
          if (opARouvrir) {
            mutationRouvrir.mutate(opARouvrir);
          }
        }}
      />
    </div>
  );
}
