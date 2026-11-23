'use client';

import * as React from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import type { TotauxOperation } from '@rafiki/contrat';

export interface BandeauAvertissementsProps {
  totaux: TotauxOperation;
}

export function BandeauAvertissements({ totaux }: BandeauAvertissementsProps) {
  const sansCodeBanque = totaux.nombre_sans_code_banque || 0;
  const telEnDouble = totaux.nombre_telephones_en_double || 0;
  const totalPoints = sansCodeBanque + telEnDouble;

  if (totalPoints === 0) {
    return null;
  }

  const morceaux: string[] = [];
  if (sansCodeBanque > 0) {
    morceaux.push(
      `${sansCodeBanque} employé${sansCodeBanque > 1 ? 's' : ''} sans code banque`
    );
  }
  if (telEnDouble > 0) {
    morceaux.push(
      `${telEnDouble} numéro${telEnDouble > 1 ? 's' : ''} de téléphone en double`
    );
  }

  return (
    <div
      role="alert"
      className="flex items-center justify-between min-h-[3.25rem] px-5 py-2.5 rounded-[10px] bg-[var(--warning-tint)] border border-[var(--warning-border)] text-[var(--warning-text)] text-[1.0625rem] animate-in fade-in duration-150"
    >
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 shrink-0 text-[var(--warning-text)]" />
        <span>
          <strong className="font-semibold">
            {totalPoints} point{totalPoints > 1 ? 's' : ''} à vérifier :
          </strong>{' '}
          {morceaux.join(' · ')}
        </span>
      </div>
      <Link
        href="/employes/"
        className="font-medium underline hover:text-black transition-colors shrink-0 ml-4 cursor-pointer"
      >
        Voir la liste des employés
      </Link>
    </div>
  );
}
