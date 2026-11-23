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

function CarteSynthese({
  titre,
  valeur,
  tooltipText,
  variation,
}: CarteSyntheseProps) {
  let pastilleVariation = null;

  if (variation?.sens === 'hausse') {
    pastilleVariation = (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--primary-tint)] text-[var(--primary-strong)] text-[0.9375rem] font-semibold">
        <TrendingUp className="w-4 h-4" />
        {formaterPourcentage(variation.pourcentage)}
      </span>
    );
  } else if (variation?.sens === 'baisse') {
    pastilleVariation = (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--danger-tint)] text-[var(--danger)] text-[0.9375rem] font-semibold">
        <TrendingDown className="w-4 h-4" />
        {formaterPourcentage(variation.pourcentage)}
      </span>
    );
  } else if (variation?.sens === 'stable') {
    pastilleVariation = (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--hover)] text-[var(--text-2)] text-[0.9375rem] font-medium">
        <ArrowRight className="w-4 h-4" />
        0,0&nbsp;%
      </span>
    );
  } else {
    pastilleVariation = (
      <span className="text-[0.9375rem] text-[var(--text-2)]">
        Aucun mois de comparaison
      </span>
    );
  }

  const carteContenu = (
    <div className="flex flex-col justify-between h-[11.875rem] rounded-[10px] bg-[var(--surface)] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.12)] border border-[var(--border)] transition-shadow hover:shadow-md">
      {/* En-tête de carte */}
      <div className="flex items-center gap-3 pb-2.5 border-b border-[var(--border)]">
        <span className="w-2.5 h-2.5 rounded-full bg-[var(--primary)] shrink-0" />
        <span className="text-[1.375rem] font-medium text-[var(--text)] truncate">
          {titre}
        </span>
      </div>

      {/* Valeur */}
      <div className="text-[2.5rem] font-bold text-[var(--text)] tracking-tight font-mono tabular-nums my-auto">
        {valeur}
      </div>

      {/* Pied */}
      <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)] text-[0.9375rem] text-[var(--text-2)]">
        {pastilleVariation}
        {variation?.pourcentage !== null && (
          <span className="truncate">Par rapport au mois dernier</span>
        )}
      </div>
    </div>
  );

  if (tooltipText) {
    return <Tooltip content={tooltipText}>{carteContenu}</Tooltip>;
  }

  return carteContenu;
}

export function CartesSynthese({ synthese }: CartesSyntheseProps) {
  const ecartNum = synthese.ecart_arrondi || '0';
  const prefixSigne = !ecartNum.startsWith('-') && ecartNum !== '0' && ecartNum !== '0.00' ? '+' : '';
  const tooltipTotalPaye = `Somme des virements arrondis. Salaire net exact : ${formaterMontant(
    synthese.total_net_exact,
    2
  )} · Écart d'arrondi : ${prefixSigne}${formaterMontant(synthese.ecart_arrondi, 2)}.`;

  return (
    <div className="rounded-[12px] bg-[var(--surface)] p-5 border border-[var(--border)]">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-[1.1875rem]">
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
