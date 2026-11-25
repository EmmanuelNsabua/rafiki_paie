'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formaterMontant, formaterPourcentage, formaterDate, libelleOperation } from '@/lib/format';
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
import { Plus, ArrowUpRight, ArrowDownRight, Minus, Lock, Clock, Upload } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

export default function JournalDePaiePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [dialogueOuvert, setDialogueOuvert] = React.useState(false);
  const [anneeFiltre, setAnneeFiltre] = React.useState<number | null>(null);
  const [opARouvrir, setOpARouvrir] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [importEnCours, setImportEnCours] = React.useState(false);

  const handleImporterOperation = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const cheminFichier = (file as any).path;
    if (!cheminFichier) {
      toast.error('Veuillez exécuter l application desktop pour importer un classeur local.');
      return;
    }

    setImportEnCours(true);
    try {
      const anneeCible = new Date().getFullYear();
      const moisCible = new Date().getMonth() + 1;

      const res = await api.importExcel.executer({
        cheminFichier,
        annee: anneeCible,
        mois: moisCible,
        modeDoublon: 'mettre_a_jour',
        creerOperation: true,
        lignesAExclure: [],
      });

      toast.success(
        `Opération ${moisCible}/${anneeCible} importée avec succès (${res.lignesPaieCrees} ligne(s) de paie).`
      );
      queryClient.invalidateQueries({ queryKey: ['operations'] });
      if (res.operationCreeeId) {
        router.push(`/operation/?id=${res.operationCreeeId}`);
      }
    } catch (err: any) {
      toast.error(`Échec de l import d opération : ${err?.message || err}`);
    } finally {
      setImportEnCours(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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

  // Seules les 3 dernières années sont affichées dans le filtre du journal
  const anneesRecentes = React.useMemo(() => annees.slice(0, 3), [annees]);

  React.useEffect(() => {
    if (anneesRecentes.length > 0 && anneeFiltre === null) {
      setAnneeFiltre(anneesRecentes[0]);
    }
  }, [anneesRecentes, anneeFiltre]);

  const operationsFiltrees = React.useMemo(() => {
    if (anneeFiltre === null) {
      return operations.filter((op) => anneesRecentes.includes(op.annee));
    }
    return operations.filter((op) => op.annee === anneeFiltre);
  }, [operations, anneeFiltre, anneesRecentes]);

  return (
    <div className="space-y-[1.143rem] pb-[2.857rem]">
      {/* Carte d'en-tête */}
      <div className="min-h-[4.571rem] bg-[var(--surface)] rounded-[0.571rem] p-[1.143rem] flex items-center justify-between border border-[var(--border)] shadow-xs">
        <h1 className="text-[1.714rem] font-semibold text-[var(--text)] tracking-tight leading-[2.286rem]">
          Journal de paie
        </h1>
        <div className="flex items-center gap-[0.571rem]">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImporterOperation}
            accept=".xlsx"
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            disabled={importEnCours}
            onClick={() => fileInputRef.current?.click()}
            className="h-[2.429rem] px-[1rem] rounded-[0.429rem] flex items-center gap-[0.429rem] text-[0.929rem] font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--hover)] transition-colors cursor-pointer"
          >
            <Upload className="w-[1.143rem] h-[1.143rem]" />
            <span>{importEnCours ? 'Importation...' : 'Importer une opération'}</span>
          </Button>
          <Button
            onClick={() => setDialogueOuvert(true)}
            className="h-[2.429rem] px-[1rem] rounded-[0.429rem] flex items-center gap-[0.429rem] text-[0.929rem] font-semibold"
          >
            <Plus className="w-[1.143rem] h-[1.143rem]" />
            <span>Nouvelle opération</span>
          </Button>
        </div>
      </div>

      {/* Carte de tableau */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[0.571rem] overflow-hidden shadow-xs">
        {/* Bandeau de titre du tableau */}
        <div className="h-[3.143rem] px-[1.143rem] flex items-center justify-between border-b border-[var(--border)]">
          <h2 className="text-[1.143rem] font-semibold text-[var(--text)]">Opérations de paie</h2>
          <div className="flex items-center gap-[0.857rem]">
            <span className="text-[0.857rem] text-[var(--text-2)]">
              {operationsFiltrees.length} opération{operationsFiltrees.length > 1 ? 's' : ''} ·
              Montants en dollars ($)
            </span>

            {/* Sélecteur des 3 dernières années */}
            {anneesRecentes.length > 0 && (
              <div className="flex items-center gap-[0.286rem] bg-[var(--hover)] p-[0.143rem] rounded-full border border-[var(--border)]">
                {anneesRecentes.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAnneeFiltre(a)}
                    className={`px-[0.571rem] py-[0.143rem] rounded-full text-[0.857rem] font-medium transition-colors cursor-pointer ${
                      anneeFiltre === a
                        ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs font-semibold'
                        : 'text-[var(--text-2)] hover:text-[var(--text)]'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            )}

            {/* Lien vers Historique complet */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => router.push('/historique/')}
              className="text-[0.786rem] text-[var(--text-2)] hover:text-[var(--text)] flex items-center gap-1 h-[1.714rem] px-2 rounded-full cursor-pointer"
            >
              <span>Historique complet</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Grille du tableau */}
        {isLoading ? (
          <div className="p-[2.857rem] text-center text-[1rem] text-[var(--text-2)]">
            Chargement des opérations…
          </div>
        ) : operationsFiltrees.length === 0 ? (
          <div className="p-[2.857rem] text-center space-y-[0.571rem]">
            <p className="text-[1rem] font-medium text-[var(--text)]">
              Aucune opération enregistrée pour le moment.
            </p>
            <p className="text-[0.857rem] text-[var(--text-2)]">
              Cliquez sur « Nouvelle opération » pour démarrer la paie du mois.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[14rem]">Période</TableHead>
                <TableHead className="w-[6rem] text-center">Employés</TableHead>
                <TableHead className="text-right w-[10rem]">Total payé ($)</TableHead>
                <TableHead className="w-[8rem] text-center">Variation</TableHead>
                <TableHead className="w-[10rem]">Terminée le</TableHead>
                <TableHead className="w-[8rem]">État</TableHead>
                <TableHead className="w-[5rem] text-center">Action</TableHead>
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
                      <div className="text-[0.857rem] text-[var(--text-2)]">
                        {op.jours_ouvrables} jours ouvrables
                      </div>
                    </TableCell>

                    {/* Employés */}
                    <TableCell className="text-center font-medium">{op.nombre_employes}</TableCell>

                    {/* Total payé */}
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formaterMontant(op.total_paye || op.total_virement)}
                    </TableCell>

                    {/* Variation */}
                    <TableCell className="text-center">
                      {varTotal?.pourcentage ? (
                        <span
                          className={`inline-flex items-center gap-[0.286rem] px-[0.571rem] py-[0.143rem] rounded-full text-[0.786rem] font-semibold ${
                            varTotal.sens === 'hausse'
                              ? 'bg-[var(--primary-tint)] text-[var(--primary-strong)]'
                              : varTotal.sens === 'baisse'
                                ? 'bg-[var(--danger-tint)] text-[var(--danger)]'
                                : 'bg-[var(--hover)] text-[var(--text-2)]'
                          }`}
                        >
                          {varTotal.sens === 'hausse' && (
                            <ArrowUpRight className="w-[0.857rem] h-[0.857rem]" />
                          )}
                          {varTotal.sens === 'baisse' && (
                            <ArrowDownRight className="w-[0.857rem] h-[0.857rem]" />
                          )}
                          {varTotal.sens === 'stable' && (
                            <Minus className="w-[0.857rem] h-[0.857rem]" />
                          )}
                          <span>{formaterPourcentage(varTotal.pourcentage)}</span>
                        </span>
                      ) : (
                        <span className="text-[var(--text-2)] text-[0.857rem]">—</span>
                      )}
                    </TableCell>

                    {/* Terminée le */}
                    <TableCell className="text-[var(--text-2)]">
                      {op.terminee_le ? formaterDate(op.terminee_le) : '—'}
                    </TableCell>

                    {/* État */}
                    <TableCell>
                      {estTerminee ? (
                        <Badge variant="secondary" className="gap-[0.286rem]">
                          <Lock className="w-[0.857rem] h-[0.857rem]" />
                          <span>Terminée</span>
                        </Badge>
                      ) : (
                        <Badge variant="actif" className="gap-[0.286rem]">
                          <Clock className="w-[0.857rem] h-[0.857rem]" />
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
                            className="w-[2.286rem] h-[2.286rem] rounded-[0.429rem] border border-[var(--border)] bg-transparent hover:bg-[var(--hover)] flex items-center justify-center text-[var(--text)] cursor-pointer"
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
        <div className="h-[2.571rem] px-[1.143rem] border-t border-[var(--border)] flex items-center text-[0.857rem] text-[var(--text-2)]">
          Affichage de 1 à {operationsFiltrees.length} opération
          {operationsFiltrees.length > 1 ? 's' : ''}
        </div>
      </div>

      {/* Dialogue de création d'opération */}
      <DialogueNouvelleOperation ouvert={dialogueOuvert} onOpenChange={setDialogueOuvert} />

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
