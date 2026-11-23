'use client';

import * as React from 'react';
import { AlertDialog } from '@/components/ui/alert-dialog';

export interface DialogueConfirmationRouvrirProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmer: () => Promise<void>;
  chargement?: boolean;
}

export function DialogueConfirmationRouvrir({
  open,
  onOpenChange,
  onConfirmer,
  chargement = false,
}: DialogueConfirmationRouvrirProps) {
  const description = (
    <div className="space-y-3 pt-2 text-[var(--text-2)]">
      <p>
        Êtes-vous sûr de vouloir rouvrir cette opération de paie&nbsp;?
      </p>
      <p className="p-3 rounded-[8px] bg-[var(--warning-tint)] border border-[var(--warning-border)] text-[var(--warning-text)] text-[0.9375rem]">
        Les montants figés seront recalculés et les lignes redeviendront modifiables.
      </p>
    </div>
  );

  return (
    <AlertDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Rouvrir la paie"
      description={description}
      actionText={chargement ? 'Déverrouillage…' : 'Rouvrir la paie'}
      cancelText="Annuler"
      onAction={() => {
        onConfirmer().catch(() => {});
      }}
    />
  );
}
