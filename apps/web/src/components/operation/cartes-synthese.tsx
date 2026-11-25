'use client';

import * as React from 'react';
import type { SyntheseOperation, Variation } from '@rafiki/contrat';
import { Tooltip } from '@/components/ui/tooltip';
import { formaterMontant, formaterPourcentage } from '@/lib/format';
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CartesSyntheseProps {
  synthese: SyntheseOperation;
}

interface CarteSyntheseProps {
  titre: string;
  valeur: string;
  tooltipText?: string;
  variation?: Variation;
}

function CarteSynthese({ titre, valeur, tooltipText, variation }: CarteSyntheseProps) {
  let pastilleVariation = null;

  if (variation?.sens === 'hausse') {
    pastilleVariation = (
      <span className="inline-flex items-center gap-[0.286rem] px-[0.571rem] py-[0.143rem] rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[0.857rem] font-semibold">
        <TrendingUp className="w-[1rem] h-[1rem]" />
        {formaterPourcentage(variation.pourcentage)}
      </span>
    );
  } else if (variation?.sens === 'baisse') {
    pastilleVariation = (
      <span className="inline-flex items-center gap-[0.286rem] px-[0.571rem] py-[0.143rem] rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 text-[0.857rem] font-semibold">
        <TrendingDown className="w-[1rem] h-[1rem]" />
        {formaterPourcentage(variation.pourcentage)}
      </span>
    );
  } else if (variation?.sens === 'stable') {
    pastilleVariation = (
      <span className="inline-flex items-center gap-[0.286rem] px-[0.571rem] py-[0.143rem] rounded-full bg-[var(--hover)] text-[var(--text-2)] text-[0.857rem] font-medium">
        <ArrowRight className="w-[1rem] h-[1rem]" />
        0,0&nbsp;%
      </span>
    );
  } else {
    pastilleVariation = (
      <span className="text-[0.857rem] text-[var(--text-2)]">Aucun mois de comparaison</span>
    );
  }

  const carteContenu = (
    <div className="flex flex-col justify-between h-[8rem] w-full rounded-[0.429rem] bg-[var(--surface)] p-[0.857rem] shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[var(--border)] transition-shadow hover:shadow-sm">
      {/* En-tête de carte */}
      <div className="flex items-center gap-[0.571rem] pb-[0.429rem] border-b border-[var(--border)]">
        <span className="w-[0.571rem] h-[0.571rem] rounded-full bg-[var(--primary)] shrink-0" />
        <span className="text-[0.929rem] leading-[1.286rem] font-medium text-[var(--text)] truncate">
          {titre}
        </span>
      </div>

      {/* Valeur */}
      <div className="text-[1.714rem] leading-[2.286rem] font-bold text-[var(--text)] tracking-tight font-mono tabular-nums my-auto">
        {valeur}
      </div>

      {/* Pied */}
      <div className="flex items-center gap-[0.429rem] pt-[0.429rem] border-t border-[var(--border)] text-[0.857rem] text-[var(--text-2)]">
        {pastilleVariation}
        {variation?.pourcentage !== null && (
          <span className="truncate">Par rapport au mois dernier</span>
        )}
      </div>
    </div>
  );

  if (tooltipText) {
    return (
      <div className="w-full h-full min-w-0">
        <Tooltip content={tooltipText} wrapperClassName="w-full h-full flex flex-col">
          {carteContenu}
        </Tooltip>
      </div>
    );
  }

  return <div className="w-full h-full min-w-0">{carteContenu}</div>;
}

export function CartesSynthese({ synthese }: CartesSyntheseProps) {
  const ecartNum = synthese.ecart_arrondi || '0';
  const prefixSigne =
    !ecartNum.startsWith('-') && ecartNum !== '0' && ecartNum !== '0.00' ? '+' : '';
  const tooltipTotalPaye = `Somme des virements arrondis. Salaire net exact : ${formaterMontant(
    synthese.total_net_exact,
    2
  )} · Écart d'arrondi : ${prefixSigne}${formaterMontant(synthese.ecart_arrondi, 2)}.`;

  return (
    <div className="rounded-[0.571rem] bg-[var(--surface)] p-[1.143rem] border border-[var(--border)] shadow-xs">
      <div className="grid grid-cols-4 gap-[1.143rem] w-full">
        {/* 1. Masse salariale */}
        <CarteSynthese
          titre="Masse salariale"
          valeur={formaterMontant(synthese.masse_salariale, 0)}
          tooltipText="Somme des salaires de base des employés"
          variation={synthese.variations.masse_salariale}
        />

        {/* 2. Total payé */}
        <CarteSynthese
          titre="Total payé"
          valeur={formaterMontant(synthese.total_paye, 0)}
          tooltipText={tooltipTotalPaye}
          variation={synthese.variations.total_paye}
        />

        {/* 3. Salaire moyen */}
        <CarteSynthese
          titre="Salaire moyen"
          valeur={formaterMontant(synthese.salaire_moyen, 2)}
          tooltipText="Masse salariale divisée par le nombre d'employés"
          variation={synthese.variations.salaire_moyen}
        />

        {/* 4. Nombre d'employés */}
        <CarteSynthese
          titre="Nombre d'employés"
          valeur={String(synthese.nombre_employes)}
          variation={synthese.variations.nombre_employes}
        />
      </div>
    </div>
  );
}
