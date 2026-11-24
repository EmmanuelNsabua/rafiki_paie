'use client';

import * as React from 'react';
import type {
  TotauxOperation,
  SyntheseOperation,
  OperationPaie,
  LignePaieCalculee,
} from '@rafiki/contrat';
import { formaterMontant, libelleOperation } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CheckCircle2, AlertTriangle, Building2, Users } from 'lucide-react';
import Decimal from 'decimal.js';

export interface DialogueRecapitulatifProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operation: OperationPaie;
  totaux: TotauxOperation;
  synthese: SyntheseOperation;
  lignes?: LignePaieCalculee[];
}

export function DialogueRecapitulatif({
  open,
  onOpenChange,
  operation,
  totaux,
  synthese,
  lignes = [],
}: DialogueRecapitulatifProps) {
  const ecart = synthese.ecart_arrondi || '0';
  const prefixSigne = !ecart.startsWith('-') && ecart !== '0' && ecart !== '0.00' ? '+' : '';
  const aDesErreurs = (totaux.nombre_lignes_erreur || 0) > 0;

  // Calculs précis des rubriques conformes à l'onglet Récapitulatif du classeur Excel
  const totauxRubriques = React.useMemo(() => {
    let somHs = new Decimal(0);
    let somRetrait = new Decimal(0);
    let somMaladie = new Decimal(0);
    let somConge = new Decimal(0);
    let somAbsence = new Decimal(0);
    let somRetenues = new Decimal(0);
    let somSalaireAPayer = new Decimal(0);

    for (const l of lignes) {
      somHs = somHs.plus(l.hs || 0);
      somRetrait = somRetrait.plus(l.retrait || 0);
      somMaladie = somMaladie.plus(l.retenue_maladie || 0);
      somConge = somConge.plus(l.retenue_conge || 0);
      somAbsence = somAbsence.plus(l.retenue_absence || 0);
      somRetenues = somRetenues.plus(l.total_retenues || 0);
      somSalaireAPayer = somSalaireAPayer.plus(l.salaire_a_payer || 0);
    }

    return {
      totalHs: somHs.toFixed(2),
      totalRetrait: somRetrait.toFixed(2),
      totalMaladie: somMaladie.toFixed(2),
      totalConge: somConge.toFixed(2),
      totalAbsence: somAbsence.toFixed(2),
      totalRetenues: somRetenues.toFixed(2),
      totalSalaireAPayer: somSalaireAPayer.toFixed(2),
    };
  }, [lignes]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} width="max-w-3xl">
      <div className="space-y-[1.429rem]">
        {/* En-tête aéré */}
        <div className="flex items-start justify-between border-b border-[var(--border)] pb-[1.143rem]">
          <div>
            <span className="text-[0.786rem] font-bold uppercase tracking-wider text-[var(--text-2)]">
              Contrôle & Synthèse
            </span>
            <h2 className="text-[1.571rem] font-bold text-[var(--text)] mt-[0.286rem] tracking-tight">
              Récapitulatif — {libelleOperation(operation.annee, operation.mois)}
            </h2>
            <p className="text-[0.929rem] text-[var(--text-2)] mt-[0.286rem]">
              Vue d’ensemble des totaux pour vérification avant virement bancaire.
            </p>
          </div>

          <div className="flex items-center gap-[0.571rem]">
            {aDesErreurs ? (
              <span className="inline-flex items-center gap-[0.357rem] px-[0.714rem] py-[0.357rem] rounded-full bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 text-[0.857rem] font-semibold border border-red-200">
                <AlertTriangle className="w-[1rem] h-[1rem]" />
                <span>{totaux.nombre_lignes_erreur} erreur(s)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-[0.357rem] px-[0.714rem] py-[0.357rem] rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[0.857rem] font-semibold border border-emerald-200">
                <CheckCircle2 className="w-[1rem] h-[1rem]" />
                <span>Conforme</span>
              </span>
            )}
          </div>
        </div>

        {/* BLOC 1 : CARTE MAÎTRESSE - VIREMENT BANCAIRE FINAL */}
        <div className="rounded-[0.714rem] bg-[var(--page)] border border-[var(--border)] p-[1.429rem] shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-[1.143rem]">
            <div>
              <div className="flex items-center gap-[0.571rem] text-[0.929rem] font-semibold text-[var(--text-2)]">
                <Building2 className="w-[1.143rem] h-[1.143rem]" />
                <span>TOTAL VIREMENT BANQUE (Arrondi à la dizaine)</span>
              </div>
              <div className="text-[2.571rem] font-bold text-[var(--text)] tracking-tight font-mono tabular-nums mt-[0.429rem]">
                {formaterMontant(synthese.total_paye, 2)}
              </div>
              <p className="text-[0.857rem] text-[var(--text-2)] mt-[0.286rem]">
                Montant global débité pour l’ensemble du personnel.
              </p>
            </div>

            <div className="border-t md:border-t-0 md:border-l border-[var(--border)] pt-[0.857rem] md:pt-0 md:pl-[1.429rem] space-y-[0.571rem]">
              <div>
                <span className="text-[0.786rem] text-[var(--text-2)] uppercase font-semibold">
                  Effectif rémunéré
                </span>
                <div className="text-[1.286rem] font-bold text-[var(--text)] flex items-center gap-[0.429rem]">
                  <Users className="w-[1.143rem] h-[1.143rem] text-[var(--text-2)]" />
                  <span>{synthese.nombre_employes} employés actifs</span>
                </div>
              </div>

              <div>
                <span className="text-[0.786rem] text-[var(--text-2)] uppercase font-semibold">
                  Net exact avant arrondi
                </span>
                <div className="text-[1.143rem] font-semibold text-[var(--text)] font-mono tabular-nums">
                  {formaterMontant(synthese.total_net_exact, 2)}
                </div>
              </div>

              <div>
                <span className="text-[0.786rem] text-[var(--text-2)] uppercase font-semibold">
                  Écart d’arrondissement
                </span>
                <div className="text-[1rem] font-medium text-[var(--text-2)] font-mono tabular-nums">
                  {prefixSigne}
                  {formaterMontant(synthese.ecart_arrondi, 2)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BLOC 2 & 3 : DÉTAIL DES COMPOSANTES (2 COLONNES) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[1.143rem]">
          {/* Colonne gauche : Rémunérations & Ajouts */}
          <div className="rounded-[0.571rem] bg-[var(--surface)] border border-[var(--border)] p-[1.143rem] space-y-[0.857rem]">
            <h3 className="text-[1.071rem] font-bold text-[var(--text)] pb-[0.429rem] border-b border-[var(--border)]">
              1. Rémunérations brutes
            </h3>

            <div className="space-y-[0.571rem] text-[0.929rem]">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-2)]">Masse salariale de base :</span>
                <span className="font-semibold text-[var(--text)] font-mono tabular-nums">
                  {formaterMontant(synthese.masse_salariale, 2)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[var(--text-2)]">Heures sup. et Primes :</span>
                <span className="font-semibold text-[var(--text)] font-mono tabular-nums">
                  {formaterMontant(totauxRubriques.totalHs, 2)}
                </span>
              </div>

              <div className="flex items-center justify-between pt-[0.571rem] border-t border-dashed border-[var(--border)] text-[1rem] font-bold">
                <span>Salaire brut à payer :</span>
                <span className="text-[var(--text)] font-mono tabular-nums">
                  {formaterMontant(totauxRubriques.totalSalaireAPayer, 2)}
                </span>
              </div>
            </div>
          </div>

          {/* Colonne droite : Déductions & Retenues */}
          <div className="rounded-[0.571rem] bg-[var(--surface)] border border-[var(--border)] p-[1.143rem] space-y-[0.857rem]">
            <h3 className="text-[1.071rem] font-bold text-[var(--text)] pb-[0.429rem] border-b border-[var(--border)]">
              2. Déductions & Retenues
            </h3>

            <div className="space-y-[0.571rem] text-[0.929rem]">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-2)]">Retraits / Avances déjà perçues :</span>
                <span className="font-medium text-[var(--text)] font-mono tabular-nums">
                  {formaterMontant(totauxRubriques.totalRetrait, 2)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[var(--text-2)]">Retenues Maladie (1/3) :</span>
                <span className="font-medium text-[var(--text)] font-mono tabular-nums">
                  {formaterMontant(totauxRubriques.totalMaladie, 2)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[var(--text-2)]">Retenues Congés spéciaux (1/3) :</span>
                <span className="font-medium text-[var(--text)] font-mono tabular-nums">
                  {formaterMontant(totauxRubriques.totalConge, 2)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[var(--text-2)]">Retenues Absences injustifiées :</span>
                <span className="font-medium text-[var(--text)] font-mono tabular-nums">
                  {formaterMontant(totauxRubriques.totalAbsence, 2)}
                </span>
              </div>

              <div className="flex items-center justify-between pt-[0.571rem] border-t border-dashed border-[var(--border)] text-[1rem] font-bold text-red-600 dark:text-red-400">
                <span>Total des retenues :</span>
                <span className="font-mono tabular-nums">
                  - {formaterMontant(totauxRubriques.totalRetenues, 2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Pied de dialogue */}
        <div className="pt-[1.143rem] border-t border-[var(--border)] flex items-center justify-end">
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-[2.429rem] px-[1.429rem] rounded-[0.429rem]"
          >
            Fermer
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
