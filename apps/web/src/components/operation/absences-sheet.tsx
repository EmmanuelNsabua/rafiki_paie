'use client';

import * as React from 'react';
import type { LignePaieCalculee } from '@rafiki/contrat';
import { Sheet, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formaterMontant, normaliserSaisieDecimale } from '@/lib/format';

export interface AbsencesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ligne: LignePaieCalculee | null;
  diviseurRetenue?: number;
  estTerminee: boolean;
  onModifierAbsences: (
    ligneId: string,
    valeurs: { jours_maladie: string; jours_conge: string; jours_absence: string }
  ) => Promise<void>;
}

export function AbsencesSheet({
  open,
  onOpenChange,
  ligne,
  diviseurRetenue = 3,
  estTerminee,
  onModifierAbsences,
}: AbsencesSheetProps) {
  const [maladie, setMaladie] = React.useState('');
  const [conge, setConge] = React.useState('');
  const [absence, setAbsence] = React.useState('');
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null);

  // Synchronisation avec la ligne sélectionnée
  React.useEffect(() => {
    if (ligne) {
      setMaladie(ligne.jours_maladie || '0');
      setConge(ligne.jours_conge || '0');
      setAbsence(ligne.jours_absence || '0');
    }
  }, [ligne]);

  const planifierModification = (
    nouvellesValeurs: { jours_maladie: string; jours_conge: string; jours_absence: string }
  ) => {
    if (!ligne || estTerminee) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      onModifierAbsences(ligne.id, nouvellesValeurs).catch(() => {});
    }, 300);
  };

  const nomComplet = ligne
    ? `${ligne.nom} ${ligne.postnom || ''} ${ligne.prenom || ''}`.trim()
    : '';

  return (
    <Sheet open={open} onOpenChange={onOpenChange} width="w-[27.5rem]">
      <SheetHeader>
        <SheetTitle>Absences — {nomComplet}</SheetTitle>
        <SheetDescription>
          Saisissez les jours d’absence de l’employé pour ce mois.
        </SheetDescription>
      </SheetHeader>

      <div className="flex flex-col gap-6 py-2">
        {/* Champs de saisie des absences */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="absence-maladie" className="text-[1.0625rem] font-medium text-[var(--text)]">
              Maladie (jours)
            </Label>
            <Input
              id="absence-maladie"
              inputMode="decimal"
              disabled={estTerminee}
              value={maladie}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const norm = normaliserSaisieDecimale(e.target.value);
                setMaladie(norm);
                planifierModification({
                  jours_maladie: norm || '0',
                  jours_conge: conge || '0',
                  jours_absence: absence || '0',
                });
              }}
              className="h-11 text-[1.125rem]"
              placeholder="0"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="absence-conge" className="text-[1.0625rem] font-medium text-[var(--text)]">
              Congé de circonstance (jours)
            </Label>
            <Input
              id="absence-conge"
              inputMode="decimal"
              disabled={estTerminee}
              value={conge}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const norm = normaliserSaisieDecimale(e.target.value);
                setConge(norm);
                planifierModification({
                  jours_maladie: maladie || '0',
                  jours_conge: norm || '0',
                  jours_absence: absence || '0',
                });
              }}
              className="h-11 text-[1.125rem]"
              placeholder="0"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="absence-injustifiee" className="text-[1.0625rem] font-medium text-[var(--text)]">
              Absence non justifiée (jours)
            </Label>
            <Input
              id="absence-injustifiee"
              inputMode="decimal"
              disabled={estTerminee}
              value={absence}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const norm = normaliserSaisieDecimale(e.target.value);
                setAbsence(norm);
                planifierModification({
                  jours_maladie: maladie || '0',
                  jours_conge: conge || '0',
                  jours_absence: norm || '0',
                });
              }}
              className="h-11 text-[1.125rem]"
              placeholder="0"
            />
          </div>
        </div>

        {/* Section Retenues */}
        <div className="mt-4 p-4 rounded-[8px] bg-[var(--table-head)] border border-[var(--border)] space-y-3">
          <h3 className="text-[1.125rem] font-semibold text-[var(--text)]">Retenues</h3>
          <div className="space-y-2 text-[1rem]">
            <div className="flex justify-between items-center text-[var(--text-2)]">
              <span>Maladie :</span>
              <span className="font-medium text-[var(--text)] font-mono">
                {formaterMontant(ligne?.retenue_maladie ?? '0', 2)}
              </span>
            </div>
            <div className="flex justify-between items-center text-[var(--text-2)]">
              <span>Congé de circonstance :</span>
              <span className="font-medium text-[var(--text)] font-mono">
                {formaterMontant(ligne?.retenue_conge ?? '0', 2)}
              </span>
            </div>
            <div className="flex justify-between items-center text-[var(--text-2)]">
              <span>Absence non justifiée :</span>
              <span className="font-medium text-[var(--text)] font-mono">
                {formaterMontant(ligne?.retenue_absence ?? '0', 2)}
              </span>
            </div>
            <div className="pt-2 border-t border-[var(--border)] flex justify-between items-center font-semibold text-[var(--text)] text-[1.125rem]">
              <span>Total des retenues :</span>
              <span className="text-[var(--danger)] font-mono">
                {formaterMontant(ligne?.total_retenues ?? '0', 2)}
              </span>
            </div>
          </div>
        </div>

        {/* Texte d'aide dynamique lisant diviseurRetenue */}
        <p className="text-[0.9375rem] text-[var(--text-2)] leading-relaxed">
          Maladie et congé : 1/{diviseurRetenue} du salaire journalier par jour. Absence non justifiée : le salaire journalier complet.
        </p>
      </div>

      <SheetFooter>
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          className="cursor-pointer"
        >
          Fermer
        </Button>
      </SheetFooter>
    </Sheet>
  );
}
