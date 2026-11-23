'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { OperationPaie, ResumeOperationLister, TotauxOperation, SyntheseOperation } from '@rafiki/contrat';
import { libelleOperation } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Popover } from '@/components/ui/popover';
import { Tooltip } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { ChevronDown, Pencil, Lock, Download, Plus } from 'lucide-react';
import { DialogueConfirmationTerminer } from './dialogue-confirmation-terminer';
import { DialogueConfirmationRouvrir } from './dialogue-confirmation-rouvrir';
import { DialogueNouvelleOperation } from '@/components/journal/dialogue-nouvelle-operation';
import { cn } from '@/lib/utils';

export interface EnTeteOperationProps {
  operation: OperationPaie;
  toutesOperations: ResumeOperationLister[];
  totaux: TotauxOperation;
  synthese: SyntheseOperation;
  joursOuvrablesDefaut?: number;
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
    <div className="flex flex-col min-[1500px]:flex-row min-[1500px]:items-center justify-between gap-4 p-6 rounded-[12px] bg-[var(--surface)] border border-[var(--border)] shadow-xs">
      {/* Gauche : Titre et sélecteurs */}
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-[2.75rem] font-semibold text-[var(--text)] leading-[3.25rem] tracking-tight">
          Opération mensuelle
        </h1>

        <div className="flex flex-wrap items-center gap-3">
          {/* Sélecteur de mois */}
          <Popover
            open={menuMoisOuvert}
            onOpenChange={setMenuMoisOuvert}
            align="left"
            trigger={
              <button
                type="button"
                className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-[var(--page)] hover:bg-[var(--hover)] text-[1.25rem] font-medium text-[var(--text)] transition-colors cursor-pointer border border-[var(--border)]"
              >
                <span>{libelleOperation(operation.annee, operation.mois)}</span>
                <ChevronDown className="w-4 h-4 text-[var(--text-2)]" />
              </button>
            }
          >
            <div className="flex flex-col min-w-[16rem] py-1">
              <div className="max-h-60 overflow-y-auto divide-y divide-[var(--border)]">
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
                        'w-full flex items-center justify-between px-3 py-2 text-left text-[1rem] hover:bg-[var(--hover)] transition-colors cursor-pointer',
                        estCourante && 'bg-[var(--hover)] font-medium'
                      )}
                    >
                      <span>{libelleOperation(op.annee, op.mois)}</span>
                      <span
                        className={cn(
                          'text-[0.75rem] px-2 py-0.5 rounded-full font-medium',
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

              <div className="pt-2 mt-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => {
                    setMenuMoisOuvert(false);
                    setDialogueNouvelleOuvert(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-[1rem] text-[var(--primary-strong)] hover:bg-[var(--hover)] font-medium transition-colors cursor-pointer rounded-[6px]"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nouvelle opération…</span>
                </button>
              </div>
            </div>
          </Popover>

          {/* Pastille d'état */}
          {estTerminee ? (
            <span className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-full bg-[var(--hover)] text-[var(--text)] text-[1rem] font-medium border border-[var(--border)]">
              <Lock className="w-3.5 h-3.5 text-[var(--text-2)]" />
              <span>Terminée</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-full bg-[var(--primary-tint)] text-[var(--primary-strong)] text-[1rem] font-semibold border border-[var(--primary)]/20">
              <span className="w-2 h-2 rounded-full bg-[var(--primary)]" />
              <span>En cours</span>
            </span>
          )}

          {/* Pastille Jours ouvrables */}
          {estTerminee ? (
            <span className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-full bg-[var(--hover)] text-[var(--text-2)] text-[1rem] font-medium border border-[var(--border)]">
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
                  className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-full bg-[var(--surface)] hover:bg-[var(--hover)] text-[var(--text)] text-[1rem] font-medium border border-[var(--border)] transition-colors cursor-pointer"
                >
                  <span>{operation.jours_ouvrables} jours ouvrables</span>
                  <Pencil className="w-3.5 h-3.5 text-[var(--text-2)]" />
                </button>
              }
            >
              <form onSubmit={handleEnregistrerJours} className="flex flex-col gap-3 min-w-[14rem]">
                <label htmlFor="input-jours-ouvrables" className="text-[0.9375rem] font-medium text-[var(--text)]">
                  Jours ouvrables du mois
                </label>
                <Input
                  id="input-jours-ouvrables"
                  type="number"
                  min="1"
                  max="31"
                  value={joursSaisis}
                  onChange={(e) => setJoursSaisis(e.target.value)}
                  className="h-9 text-[1rem]"
                />
                <Button
                  type="submit"
                  disabled={sauvegardeJours}
                  className="h-9 bg-[var(--primary)] hover:bg-[var(--primary-strong)] text-white text-[0.9375rem]"
                >
                  {sauvegardeJours ? 'Enregistrement…' : 'Enregistrer'}
                </Button>
              </form>
            </Popover>
          )}
        </div>
      </div>

      {/* Droite : Boutons Exporter et Terminer/Rouvrir */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Bouton Exporter (inactif en phase 2) */}
        <Tooltip content="Bientôt disponible">
          <Button
            type="button"
            variant="outline"
            disabled
            className="h-[3.375rem] px-5 rounded-[6px] border-2 border-[var(--primary)] text-[var(--primary-strong)] text-[1.375rem] font-medium opacity-50 cursor-not-allowed flex items-center gap-2"
          >
            <Download className="w-5 h-5" />
            <span>Exporter</span>
            <ChevronDown className="w-4 h-4 ml-1 opacity-70" />
          </Button>
        </Tooltip>

        {/* Bouton Terminer ou Rouvrir */}
        {estTerminee ? (
          <Button
            type="button"
            onClick={() => setDialogueRouvrirOuvert(true)}
            className="h-[3.375rem] px-6 rounded-[6px] border-2 border-[var(--primary)] bg-transparent hover:bg-[var(--primary-tint)] text-[var(--primary-strong)] text-[1.375rem] font-semibold cursor-pointer transition-colors"
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
                'h-[3.375rem] px-6 rounded-[6px] bg-[var(--primary)] hover:bg-[var(--primary-strong)] text-white text-[1.375rem] font-semibold transition-all cursor-pointer',
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
    </div>
  );
}
