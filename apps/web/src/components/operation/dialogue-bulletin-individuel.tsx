'use client';

import * as React from 'react';
import type { LignePaieCalculee, OperationPaie } from '@rafiki/contrat';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formaterMontant, libelleOperation } from '@/lib/format';
import { FileText, Printer, X, Building2, User } from 'lucide-react';

export interface DialogueBulletinIndividuelProps {
  ouvert: boolean;
  onOpenChange: (ouvert: boolean) => void;
  ligne: LignePaieCalculee | null;
  operation: OperationPaie;
}

export function DialogueBulletinIndividuel({
  ouvert,
  onOpenChange,
  ligne,
  operation,
}: DialogueBulletinIndividuelProps) {
  if (!ligne) return null;

  const nomComplet = [ligne.nom, ligne.postnom, ligne.prenom].filter(Boolean).join(' ');
  const periode = libelleOperation(operation.annee, operation.mois);

  const handleImprimer = () => {
    window.print();
  };

  return (
    <Dialog open={ouvert} onOpenChange={onOpenChange} width="max-w-[42rem]">
      <div className="space-y-4">
        <DialogHeader className="border-b border-[var(--border)] pb-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-[1.286rem]">
              <FileText className="w-5 h-5 text-[var(--primary)]" />
              <span>Bulletin de Paie Individuel</span>
            </DialogTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleImprimer}
              className="flex items-center gap-1.5 text-xs mr-6 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimer</span>
            </Button>
          </div>
          <p className="text-xs text-[var(--text-2)]">
            École Rafiki · République Démocratique du Congo · Période : {periode}
          </p>
        </DialogHeader>

        {/* Corps du bulletin */}
        <div className="space-y-4 bg-[var(--page)] p-4 rounded-[0.429rem] border border-[var(--border)] text-sm">
          {/* Identité */}
          <div className="grid grid-cols-2 gap-4 pb-3 border-b border-[var(--border)]">
            <div>
              <span className="text-xs text-[var(--text-2)] uppercase font-semibold">Employé</span>
              <p className="font-bold text-[var(--text)] text-base">{nomComplet}</p>
              <p className="text-xs text-[var(--text-2)]">N° d ordre : {ligne.numero}</p>
              <p className="text-xs text-[var(--text-2)]">
                Fonction : {ligne.fonction || 'Non renseignée'}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-[var(--text-2)] uppercase font-semibold">
                Coordonnées
              </span>
              <p className="text-xs text-[var(--text)]">Tél : {ligne.telephone || '—'}</p>
              <p className="text-xs text-[var(--text)]">Code Banque : {ligne.code_banque || '—'}</p>
              <p className="text-xs text-[var(--text-2)]">
                Jours ouvrables : {operation.jours_ouvrables} j
              </p>
            </div>
          </div>

          {/* Tableau des rubriques */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase text-[var(--text-2)]">
              Rubriques et retenues
            </h4>
            <div className="rounded-[0.286rem] border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
              <div className="flex justify-between px-3 py-2 text-xs border-b border-[var(--border)]">
                <span className="text-[var(--text)]">Salaire de base</span>
                <span className="font-mono font-medium">
                  {formaterMontant(ligne.salaire_base, 2)}
                </span>
              </div>
              <div className="flex justify-between px-3 py-2 text-xs border-b border-[var(--border)]">
                <span className="text-[var(--text)]">Heures supplémentaires / Primes</span>
                <span className="font-mono font-medium">+{formaterMontant(ligne.hs, 2)}</span>
              </div>
              <div className="flex justify-between px-3 py-2 text-xs border-b border-[var(--border)]">
                <span className="text-[var(--text)]">Retrait / Avance sur salaire</span>
                <span className="font-mono font-medium">-{formaterMontant(ligne.retrait, 2)}</span>
              </div>
              <div className="flex justify-between px-3 py-2 text-xs bg-[var(--hover)] font-semibold border-b border-[var(--border)]">
                <span>Salaire à payer</span>
                <span className="font-mono">{formaterMontant(ligne.salaire_a_payer, 2)}</span>
              </div>

              {/* Retenues */}
              <div className="flex justify-between px-3 py-2 text-xs border-b border-[var(--border)] text-[var(--text-2)]">
                <span>Retenue Maladie ({ligne.jours_maladie || 0} j)</span>
                <span className="font-mono">-{formaterMontant(ligne.retenue_maladie, 2)}</span>
              </div>
              <div className="flex justify-between px-3 py-2 text-xs border-b border-[var(--border)] text-[var(--text-2)]">
                <span>Retenue Congé de circonstance ({ligne.jours_conge || 0} j)</span>
                <span className="font-mono">-{formaterMontant(ligne.retenue_conge, 2)}</span>
              </div>
              <div className="flex justify-between px-3 py-2 text-xs border-b border-[var(--border)] text-[var(--text-2)]">
                <span>Retenue Absence non justifiée ({ligne.jours_absence || 0} j)</span>
                <span className="font-mono">-{formaterMontant(ligne.retenue_absence, 2)}</span>
              </div>

              {/* Totaux */}
              <div className="flex justify-between px-3 py-2 text-xs font-semibold bg-[var(--hover)] border-b border-[var(--border)]">
                <span>Global Net (avant arrondi)</span>
                <span className="font-mono">{formaterMontant(ligne.net_global, 2)}</span>
              </div>
              <div className="flex justify-between px-3 py-2.5 text-sm font-bold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300">
                <span>Virement bancaire (arrondi à 10 $)</span>
                <span className="font-mono text-base">{formaterMontant(ligne.virement, 2)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
