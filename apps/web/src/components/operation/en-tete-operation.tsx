'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type {
  OperationPaie,
  ResumeOperationLister,
  TotauxOperation,
  SyntheseOperation,
  LignePaieCalculee,
} from '@rafiki/contrat';
import { libelleOperation } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Popover } from '@/components/ui/popover';
import { Tooltip } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import {
  ChevronDown,
  Pencil,
  Lock,
  Download,
  Plus,
  FileSpreadsheet,
  ArrowLeft,
} from 'lucide-react';
import { DialogueConfirmationTerminer } from './dialogue-confirmation-terminer';
import { DialogueConfirmationRouvrir } from './dialogue-confirmation-rouvrir';
import { DialogueNouvelleOperation } from '@/components/journal/dialogue-nouvelle-operation';
import { DialogueRecapitulatif } from './dialogue-recapitulatif';
import { DialogueExportsOperation } from './dialogue-exports-operation';
import { cn } from '@/lib/utils';

export interface EnTeteOperationProps {
  operation: OperationPaie;
  toutesOperations: ResumeOperationLister[];
  totaux: TotauxOperation;
  synthese: SyntheseOperation;
  joursOuvrablesDefaut?: number;
  lignes?: LignePaieCalculee[];
  onModifierJours: (jours: number) => Promise<void>;
  onTerminer: () => Promise<void>;
  onRouvrir: () => Promise<void>;
}

export function EnTeteOperation({
  operation,
  toutesOperations,
  totaux,
  synthese,
  joursOuvrablesDefaut = 22,
  lignes = [],
  onModifierJours,
  onTerminer,
  onRouvrir,
}: EnTeteOperationProps) {
  const router = useRouter();
  const estTerminee = operation.statut === 'terminee';

  // Popover jours ouvrables
  const [popoverJoursOuvert, setPopoverJoursOuvert] = React.useState(false);
  const [joursSaisis, setJoursSaisis] = React.useState(String(operation.jours_ouvrables));
  const [sauvegardeJours, setSauvegardeJours] = React.useState(false);

  // Dialogues
  const [dialogueTerminerOuvert, setDialogueTerminerOuvert] = React.useState(false);
  const [dialogueRouvrirOuvert, setDialogueRouvrirOuvert] = React.useState(false);
  const [dialogueNouvelleOuvert, setDialogueNouvelleOuvert] = React.useState(false);
  const [dialogueRecapitulatifOuvert, setDialogueRecapitulatifOuvert] = React.useState(false);
  const [dialogueExportsOuvert, setDialogueExportsOuvert] = React.useState(false);
  const [actionEnCours, setActionEnCours] = React.useState(false);

  // Sélecteur de mois dropdown
  const [menuMoisOuvert, setMenuMoisOuvert] = React.useState(false);

  React.useEffect(() => {
    setJoursSaisis(String(operation.jours_ouvrables));
  }, [operation.jours_ouvrables]);

  const handleEnregistrerJours = async (e: React.FormEvent) => {
    e.preventDefault();
    const nb = parseInt(joursSaisis, 10);
    if (isNaN(nb) || nb < 1) return;
    setSauvegardeJours(true);
    try {
      await onModifierJours(nb);
      setPopoverJoursOuvert(false);
    } finally {
      setSauvegardeJours(false);
    }
  };

  const handleTerminer = async () => {
    setActionEnCours(true);
    try {
      await onTerminer();
      setDialogueTerminerOuvert(false);
    } finally {
      setActionEnCours(false);
    }
  };

  const handleRouvrir = async () => {
    setActionEnCours(true);
    try {
      await onRouvrir();
      setDialogueRouvrirOuvert(false);
    } finally {
      setActionEnCours(false);
    }
  };

  const nbLignesErreur = totaux.nombre_lignes_erreur || 0;
  const terminerBloque = nbLignesErreur > 0;
  const tooltipTerminer = terminerBloque
    ? `${nbLignesErreur} ligne${nbLignesErreur > 1 ? 's' : ''} à corriger`
    : undefined;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[1.143rem] min-h-[4.571rem] p-[1.143rem] rounded-[0.571rem] bg-[var(--surface)] border border-[var(--border)] shadow-xs">
      {/* Gauche : Bouton retour, Titre en haut, sous-éléments (mois, statut, jours ouvrables) en dessous */}
      <div className="flex flex-col gap-[0.571rem]">
        <div className="flex items-center gap-[0.714rem]">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => router.push('/journal-de-paie/')}
            className="h-[2rem] px-[0.571rem] rounded-[0.429rem] flex items-center gap-[0.357rem] text-[0.857rem] text-[var(--text-2)] hover:text-[var(--text)] cursor-pointer"
            title="Retour au Journal de paie"
          >
            <ArrowLeft className="w-[1rem] h-[1rem]" />
          </Button>
          <h1 className="text-[1.714rem] font-bold text-[var(--text)] leading-[2.286rem] tracking-tight">
            Opération mensuelle
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-[0.714rem]">
          {/* Sélecteur de mois */}
          <Popover
            open={menuMoisOuvert}
            onOpenChange={setMenuMoisOuvert}
            align="left"
            trigger={
              <button
                type="button"
                className="inline-flex items-center gap-[0.429rem] h-[2.286rem] px-[0.857rem] rounded-full bg-[var(--page)] hover:bg-[var(--hover)] text-[0.929rem] font-medium text-[var(--text)] transition-colors cursor-pointer border border-[var(--border)]"
              >
                <span>{libelleOperation(operation.annee, operation.mois)}</span>
                <ChevronDown className="w-[1rem] h-[1rem] text-[var(--text-2)]" />
              </button>
            }
          >
            <div className="flex flex-col min-w-[14rem] py-[0.286rem]">
              <div className="max-h-[15rem] overflow-y-auto divide-y divide-[var(--border)]">
                {toutesOperations.map((op) => {
                  const estCourante = op.id === operation.id;
                  return (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => {
                        setMenuMoisOuvert(false);
                        router.push(`/operation/?id=${op.id}`);
                      }}
                      className={cn(
                        'w-full flex items-center justify-between px-[0.714rem] py-[0.429rem] text-left text-[0.929rem] hover:bg-[var(--hover)] transition-colors cursor-pointer',
                        estCourante && 'bg-[var(--hover)] font-medium'
                      )}
                    >
                      <span>{libelleOperation(op.annee, op.mois)}</span>
                      <span
                        className={cn(
                          'text-[0.786rem] px-[0.5rem] py-[0.143rem] rounded-full font-medium',
                          op.statut === 'terminee'
                            ? 'bg-[var(--hover)] text-[var(--text-2)]'
                            : 'bg-[var(--primary-tint)] text-[var(--primary-strong)]'
                        )}
                      >
                        {op.statut === 'terminee' ? 'Terminée' : 'En cours'}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="pt-[0.429rem] mt-[0.429rem] border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => {
                    setMenuMoisOuvert(false);
                    setDialogueNouvelleOuvert(true);
                  }}
                  className="w-full flex items-center gap-[0.429rem] px-[0.714rem] py-[0.429rem] text-left text-[0.929rem] text-[var(--primary-strong)] hover:bg-[var(--hover)] font-medium transition-colors cursor-pointer rounded-[0.429rem]"
                >
                  <Plus className="w-[1rem] h-[1rem]" />
                  <span>Nouvelle opération…</span>
                </button>
              </div>
            </div>
          </Popover>

          {/* Pastille d'état */}
          {estTerminee ? (
            <span className="inline-flex items-center gap-[0.357rem] h-[1.571rem] px-[0.571rem] rounded-full bg-[var(--hover)] text-[var(--text)] text-[0.857rem] font-medium border border-[var(--border)]">
              <Lock className="w-[0.857rem] h-[0.857rem] text-[var(--text-2)]" />
              <span>Terminée</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-[0.357rem] h-[1.571rem] px-[0.571rem] rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[0.857rem] font-semibold border border-emerald-500/30">
              <span className="w-[0.429rem] h-[0.429rem] rounded-full bg-emerald-500" />
              <span>En cours</span>
            </span>
          )}

          {/* Pastille Jours ouvrables */}
          {estTerminee ? (
            <span className="inline-flex items-center gap-[0.357rem] h-[1.571rem] px-[0.571rem] rounded-full bg-[var(--hover)] text-[var(--text-2)] text-[0.857rem] font-medium border border-[var(--border)]">
              <span>{operation.jours_ouvrables} jours ouvrables</span>
            </span>
          ) : (
            <Popover
              open={popoverJoursOuvert}
              onOpenChange={setPopoverJoursOuvert}
              align="center"
              trigger={
                <button
                  type="button"
                  className="inline-flex items-center gap-[0.357rem] h-[1.571rem] px-[0.571rem] rounded-full bg-[var(--surface)] hover:bg-[var(--hover)] text-[var(--text)] text-[0.857rem] font-medium border border-[var(--border)] transition-colors cursor-pointer"
                >
                  <span>{operation.jours_ouvrables} jours ouvrables</span>
                  <Pencil className="w-[0.857rem] h-[0.857rem] text-[var(--text-2)]" />
                </button>
              }
            >
              <form
                onSubmit={handleEnregistrerJours}
                className="flex flex-col gap-[0.571rem] min-w-[13rem]"
              >
                <label
                  htmlFor="input-jours-ouvrables"
                  className="text-[0.857rem] font-medium text-[var(--text)]"
                >
                  Jours ouvrables du mois
                </label>
                <Input
                  id="input-jours-ouvrables"
                  type="number"
                  min="1"
                  max="31"
                  value={joursSaisis}
                  onChange={(e) => setJoursSaisis(e.target.value)}
                  className="h-[2.286rem] text-[1rem]"
                />
                <Button
                  type="submit"
                  disabled={sauvegardeJours}
                  className="h-[2.286rem] bg-[var(--primary)] hover:bg-[var(--primary-strong)] text-white text-[0.929rem]"
                >
                  {sauvegardeJours ? 'Enregistrement…' : 'Enregistrer'}
                </Button>
              </form>
            </Popover>
          )}
        </div>
      </div>

      {/* Droite : Boutons Exporter et Terminer/Rouvrir */}
      <div className="flex items-center justify-end gap-[0.714rem] shrink-0 sm:self-center">
        {/* Bouton Exporter */}
        <Button
          type="button"
          variant="outline"
          onClick={() => setDialogueExportsOuvert(true)}
          className="h-[2.429rem] px-[0.857rem] rounded-[0.429rem] border border-[var(--primary)] text-[var(--primary-strong)] text-[0.929rem] font-medium cursor-pointer flex items-center gap-[0.429rem] hover:bg-[var(--primary-tint)] transition-colors"
        >
          <Download className="w-[1.143rem] h-[1.143rem]" />
          <span>Exporter</span>
        </Button>

        {/* Bouton Terminer ou Rouvrir */}
        {estTerminee ? (
          <Button
            type="button"
            onClick={() => setDialogueRouvrirOuvert(true)}
            className="h-[2.429rem] px-[1rem] rounded-[0.429rem] border border-[var(--primary)] bg-transparent hover:bg-[var(--primary-tint)] text-[var(--primary-strong)] text-[0.929rem] font-semibold cursor-pointer transition-colors"
          >
            Rouvrir la paie
          </Button>
        ) : (
          <Tooltip content={tooltipTerminer}>
            <Button
              type="button"
              disabled={terminerBloque}
              onClick={() => setDialogueTerminerOuvert(true)}
              className={cn(
                'h-[2.429rem] px-[1rem] rounded-[0.429rem] bg-[var(--primary)] hover:bg-[var(--primary-strong)] text-white text-[0.929rem] font-semibold transition-all cursor-pointer',
                terminerBloque && 'opacity-50 cursor-not-allowed'
              )}
            >
              Terminer la paie
            </Button>
          </Tooltip>
        )}
      </div>

      {/* Dialogues */}
      <DialogueConfirmationTerminer
        open={dialogueTerminerOuvert}
        onOpenChange={setDialogueTerminerOuvert}
        synthese={synthese}
        totaux={totaux}
        onConfirmer={handleTerminer}
        chargement={actionEnCours}
      />

      <DialogueConfirmationRouvrir
        open={dialogueRouvrirOuvert}
        onOpenChange={setDialogueRouvrirOuvert}
        onConfirmer={handleRouvrir}
        chargement={actionEnCours}
      />

      <DialogueNouvelleOperation
        ouvert={dialogueNouvelleOuvert}
        onOpenChange={setDialogueNouvelleOuvert}
      />

      <DialogueRecapitulatif
        open={dialogueRecapitulatifOuvert}
        onOpenChange={setDialogueRecapitulatifOuvert}
        operation={operation}
        totaux={totaux}
        synthese={synthese}
        lignes={lignes}
      />

      <DialogueExportsOperation
        ouvert={dialogueExportsOuvert}
        onOpenChange={setDialogueExportsOuvert}
        operationId={operation.id}
        mois={operation.mois}
        annee={operation.annee}
        estTerminee={estTerminee}
      />
    </div>
  );
}
