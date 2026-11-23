'use client';

import * as React from 'react';
import { AlertDialog } from '@/components/ui/alert-dialog';
import type { TotauxOperation, SyntheseOperation } from '@rafiki/contrat';
import { formaterMontant } from '@/lib/format';
import { AlertTriangle } from 'lucide-react';

export interface DialogueConfirmationTerminerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  synthese: SyntheseOperation;
  totaux: TotauxOperation;
  onConfirmer: () => Promise<void>;
  chargement?: boolean;
}

export function DialogueConfirmationTerminer({
  open,
  onOpenChange,
  synthese,
  totaux,
  onConfirmer,
  chargement = false,
}: DialogueConfirmationTerminerProps) {
  const totalAvertissements =
    (totaux.nombre_sans_code_banque || 0) + (totaux.nombre_telephones_en_double || 0);

  const description = (
    <div className="space-y-[0.857rem] pt-[0.429rem] text-[0.857rem] text-[var(--text-2)]">
      <p>Êtes-vous sûr de vouloir terminer cette opération de paie&nbsp;?</p>
      <div className="p-[0.714rem] rounded-[0.429rem] bg-[var(--table-head)] border border-[var(--border)] space-y-[0.286rem] text-[var(--text)] text-[0.857rem]">
        <div className="flex justify-between font-medium">
          <span>Total à payer (virements) :</span>
          <span className="font-mono text-[var(--primary-strong)]">
            {formaterMontant(synthese.total_paye, 0)}
          </span>
        </div>
        <div className="flex justify-between text-[0.786rem] text-[var(--text-2)]">
          <span>Nombre d’employés :</span>
          <span>{synthese.nombre_employes}</span>
        </div>
      </div>

      {totalAvertissements > 0 && (
        <div className="flex items-start gap-[0.571rem] p-[0.714rem] rounded-[0.429rem] bg-[var(--warning-tint)] border border-[var(--warning-border)] text-[var(--warning-text)] text-[0.857rem]">
          <AlertTriangle className="w-[1rem] h-[1rem] shrink-0 mt-[0.143rem]" />
          <span>
            Attention : il reste {totalAvertissements} point{totalAvertissements > 1 ? 's' : ''} à
            vérifier sur vos employés (code banque ou téléphone).
          </span>
        </div>
      )}

      <p className="text-[0.786rem] italic">
        Une fois terminée, la paie sera verrouillée et l’ensemble des montants seront figés.
      </p>
    </div>
  );

  return (
    <AlertDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Terminer la paie"
      description={description}
      actionText={chargement ? 'Verrouillage…' : 'Confirmer et terminer'}
      cancelText="Annuler"
      onAction={() => {
        onConfirmer().catch(() => {});
      }}
    />
  );
}
