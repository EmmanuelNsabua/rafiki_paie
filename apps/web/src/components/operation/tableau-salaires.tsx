'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { LignePaieCalculee } from '@rafiki/contrat';
import { formaterMontant, normaliserSaisieDecimale, totalJoursAbsences } from '@/lib/format';
import { Tooltip } from '@/components/ui/tooltip';
import { DropdownMenu } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { HelpCircle, Clock, MoreHorizontal, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TableauSalairesProps {
  lignes: LignePaieCalculee[];
  estTerminee: boolean;
  nbEmployesNonInclus?: number;
  onAjouterNouveauxEmployes?: () => Promise<void>;
  onModifierLigne: (
    ligneId: string,
    variables: {
      hs?: string;
      retrait?: string;
      jours_maladie?: string;
      jours_conge?: string;
      jours_absence?: string;
    }
  ) => Promise<LignePaieCalculee>;
  onOuvrirAbsences: (ligne: LignePaieCalculee) => void;
}

interface CelluleEditableProps {
  valeurInitiale: string;
  estTerminee: boolean;
  onEnregistrer: (nouvelleValeur: string) => Promise<void>;
  onNaviguerSuivant?: () => void;
  className?: string;
  idCellule?: string;
}

function CelluleEditable({
  valeurInitiale,
  estTerminee,
  onEnregistrer,
  onNaviguerSuivant,
  className,
  idCellule,
}: CelluleEditableProps) {
  const [actif, setActif] = React.useState(false);
  const [valeurSaisie, setValeurSaisie] = React.useState(valeurInitiale);
  const [valeurSauvegardee, setValeurSauvegardee] = React.useState(valeurInitiale);
  const [flash, setFlash] = React.useState(false);
  const [sauvegardeEnCours, setSauvegardeEnCours] = React.useState(false);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null);
  const flashTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Synchronisation si la valeur change depuis l'extérieur (ex: annulation ou recalcul global)
  React.useEffect(() => {
    setValeurSauvegardee(valeurInitiale);
    if (!actif) {
      setValeurSaisie(valeurInitiale);
    }
  }, [valeurInitiale, actif]);

  const executerSauvegarde = async (valeurAEnvoyer: string) => {
    if (estTerminee) return;
    const norm = normaliserSaisieDecimale(valeurAEnvoyer);
    if (norm === valeurSauvegardee) return;

    setSauvegardeEnCours(true);
    try {
      await onEnregistrer(norm);
      setValeurSauvegardee(norm);

      // Animation flash de 600ms
      setFlash(true);
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = setTimeout(() => {
        setFlash(false);
      }, 600);
    } catch {
      // En cas d'erreur de réseau ou blocage, l'erreur s'affiche sur la ligne
    } finally {
      setSauvegardeEnCours(false);
    }
  };

  const planifierSauvegarde = (texte: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      executerSauvegarde(texte);
    }, 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      executerSauvegarde(valeurSaisie);
      setActif(false);
      onNaviguerSuivant?.();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setValeurSaisie(valeurSauvegardee);
      setActif(false);
    }
  };

  const handleBlur = () => {
    setActif(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    executerSauvegarde(valeurSaisie);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (estTerminee) return;
    setActif(true);
    e.target.select();
  };

  const estZero = valeurSauvegardee === '0' || valeurSauvegardee === '0.00';

  return (
    <div
      className={cn(
        'relative flex items-center justify-end px-3 py-1.5 rounded-[6px] min-h-[2.5rem] transition-colors',
        !estTerminee && !actif && 'hover:bg-[var(--hover)] hover:ring-1 hover:ring-[var(--border)] cursor-text',
        flash && 'bg-[var(--primary-tint)] transition-none',
        className
      )}
      onClick={() => {
        if (!estTerminee && !actif) {
          setActif(true);
          inputRef.current?.focus();
        }
      }}
    >
      {actif && !estTerminee ? (
        <div className="relative flex items-center w-full">
          <input
            id={idCellule}
            ref={inputRef}
            type="text"
            inputMode="decimal"
            value={valeurSaisie}
            onChange={(e) => {
              const norm = normaliserSaisieDecimale(e.target.value);
              setValeurSaisie(norm);
              planifierSauvegarde(norm);
            }}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-full text-right bg-transparent outline-none ring-2 ring-[var(--primary)] rounded-[4px] px-2 py-0.5 text-[1.25rem] font-medium font-mono tabular-nums pr-6"
            autoFocus
          />
          <span className="absolute right-2 text-[var(--text-2)] text-[1rem] pointer-events-none">$</span>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          {sauvegardeEnCours && (
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-ping mr-1" />
          )}
          <span
            className={cn(
              'font-mono tabular-nums text-[1.25rem] font-medium',
              estZero ? 'text-[var(--text-2)]' : 'text-[var(--text)]'
            )}
          >
            {formaterMontant(valeurSauvegardee, 0)}
          </span>
        </div>
      )}
    </div>
  );
}

export function TableauSalaires({
  lignes,
  estTerminee,
  nbEmployesNonInclus = 0,
  onAjouterNouveauxEmployes,
  onModifierLigne,
  onOuvrirAbsences,
}: TableauSalairesProps) {
  const router = useRouter();
  const [chargementAjout, setChargementAjout] = React.useState(false);

  // File d'attente de requêtes sérialisées par ligne pour éviter les réponses désordonnées
  const filesAttenteParLigne = React.useRef<Map<string, Promise<any>>>(new Map());

  const executerLigneModif = async (
    ligneId: string,
    variables: Parameters<TableauSalairesProps['onModifierLigne']>[1]
  ): Promise<LignePaieCalculee> => {
    const fileActuelle = filesAttenteParLigne.current.get(ligneId) || Promise.resolve();

    const prochaineTache = fileActuelle.then(async () => {
      return onModifierLigne(ligneId, variables);
    });

    filesAttenteParLigne.current.set(
      ligneId,
      prochaineTache.catch(() => {})
    );

    return prochaineTache;
  };

  const handleAjouterNouveaux = async () => {
    if (!onAjouterNouveauxEmployes) return;
    setChargementAjout(true);
    try {
      await onAjouterNouveauxEmployes();
    } finally {
      setChargementAjout(false);
    }
  };

  const focusCellule = (rowIndex: number, colName: 'hs' | 'retrait') => {
    const id = `cellule-${colName}-${rowIndex}`;
    const el = document.getElementById(id);
    el?.focus();
  };

  return (
    <div className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)] shadow-xs overflow-hidden">
      {/* Bandeau de titre du tableau */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 h-[4.4375rem] border-b border-[var(--border)]">
        <h2 className="text-[1.625rem] font-semibold text-[var(--text)] tracking-tight">
          Salaires des employés
        </h2>

        <div className="flex items-center gap-4">
          {nbEmployesNonInclus > 0 && !estTerminee && (
            <Button
              type="button"
              variant="outline"
              onClick={handleAjouterNouveaux}
              disabled={chargementAjout}
              className="h-10 text-[0.9375rem] font-medium border-[var(--primary)] text-[var(--primary-strong)] hover:bg-[var(--primary-tint)] flex items-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>
                {chargementAjout
                  ? 'Ajout en cours…'
                  : `Ajouter ${nbEmployesNonInclus} nouveau${nbEmployesNonInclus > 1 ? 'x' : ''} employé${nbEmployesNonInclus > 1 ? 's' : ''}`}
              </span>
            </Button>
          )}

          <span className="text-[1.125rem] text-[var(--text-2)]">
            {lignes.length} employé{lignes.length > 1 ? 's' : ''} affiché{lignes.length > 1 ? 's' : ''} · Montants en dollars ($)
          </span>
        </div>
      </div>

      {/* Grille de données */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="h-[3.4375rem] bg-[var(--table-head)] border-b border-[var(--border)] text-[1.25rem] font-medium text-[var(--text-2)]">
              <th className="w-16 px-4 text-center">N°</th>
              <th className="px-6">Employé</th>
              <th className="w-56 px-4 text-right">
                <div className="inline-flex items-center gap-1.5 justify-end">
                  <span>HS / Primes ($)</span>
                  <Tooltip content="Heures supplémentaires et primes : somme qui s'ajoute au salaire.">
                    <button
                      type="button"
                      aria-label="Aide sur HS et Primes"
                      className="text-[var(--text-2)] hover:text-[var(--text)] transition-colors cursor-help"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                    </button>
                  </Tooltip>
                </div>
              </th>
              <th className="w-56 px-4 text-right">
                <div className="inline-flex items-center gap-1.5 justify-end">
                  <span>Retrait ($)</span>
                  <Tooltip content="Avance déjà versée ou retenue convenue : somme qui est retirée du salaire.">
                    <button
                      type="button"
                      aria-label="Aide sur Retrait"
                      className="text-[var(--text-2)] hover:text-[var(--text)] transition-colors cursor-help"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                    </button>
                  </Tooltip>
                </div>
              </th>
              <th className="w-56 px-6 text-right">Salaire net ($)</th>
              <th className="w-24 px-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)] text-[1.3125rem]">
            {lignes.map((ligne, index) => {
              const aErreur = Boolean(ligne.erreur);
              const nomComplet = `${ligne.nom} ${ligne.postnom || ''} ${ligne.prenom || ''}`.trim();
              const totalAbs = totalJoursAbsences(
                ligne.jours_maladie,
                ligne.jours_conge,
                ligne.jours_absence
              );
              const aDesAbsences = totalAbs !== '0';

              return (
                <React.Fragment key={ligne.id}>
                  <tr
                    className={cn(
                      'h-[3.75rem] transition-colors',
                      aErreur
                        ? 'bg-[var(--danger-tint)] border-l-4 border-l-[var(--danger)]'
                        : 'hover:bg-[var(--hover)]'
                    )}
                  >
                    {/* N° */}
                    <td className="px-4 text-center text-[var(--text-2)] font-mono">
                      {String(ligne.numero).padStart(2, '0')}
                    </td>

                    {/* Employé */}
                    <td className="px-6 font-medium text-[var(--text)]">
                      <div className="flex items-center gap-2.5">
                        <span className="truncate">{nomComplet}</span>
                        {aDesAbsences && (
                          <button
                            type="button"
                            onClick={() => onOuvrirAbsences(ligne)}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--hover)] hover:bg-[var(--border)] text-[0.875rem] text-[var(--text-2)] font-normal transition-colors cursor-pointer border border-[var(--border)]"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Absences {totalAbs}&nbsp;j</span>
                          </button>
                        )}
                      </div>
                    </td>

                    {/* HS / Primes */}
                    <td className="px-4 text-right">
                      <CelluleEditable
                        idCellule={`cellule-hs-${index}`}
                        valeurInitiale={ligne.hs || '0'}
                        estTerminee={estTerminee}
                        onEnregistrer={(val) => executerLigneModif(ligne.id, { hs: val }).then(() => {})}
                        onNaviguerSuivant={() => focusCellule(index + 1, 'hs')}
                      />
                    </td>

                    {/* Retrait */}
                    <td className="px-4 text-right">
                      <CelluleEditable
                        idCellule={`cellule-retrait-${index}`}
                        valeurInitiale={ligne.retrait || '0'}
                        estTerminee={estTerminee}
                        onEnregistrer={(val) => executerLigneModif(ligne.id, { retrait: val }).then(() => {})}
                        onNaviguerSuivant={() => focusCellule(index + 1, 'retrait')}
                      />
                    </td>

                    {/* Salaire net */}
                    <td className="px-6 text-right font-semibold text-[var(--text)] font-mono tabular-nums">
                      {formaterMontant(ligne.net_global, 2)}
                    </td>

                    {/* Action */}
                    <td className="px-4 text-center">
                      <DropdownMenu
                        align="right"
                        trigger={
                          <button
                            type="button"
                            aria-label={`Actions pour ${nomComplet}`}
                            className="w-10 h-10 inline-flex items-center justify-center rounded-[6px] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--hover)] text-[var(--text-2)] hover:text-[var(--text)] transition-colors cursor-pointer"
                          >
                            <MoreHorizontal className="w-5 h-5" />
                          </button>
                        }
                        items={[
                          {
                            label: 'Absences',
                            onClick: () => onOuvrirAbsences(ligne),
                          },
                          {
                            label: 'Bulletin',
                            disabled: true,
                            tooltip: 'Bientôt disponible',
                          },
                          {
                            label: 'Voir la fiche',
                            onClick: () => router.push(`/employes/?id=${ligne.employe_id}`),
                          },
                        ]}
                      />
                    </td>
                  </tr>

                  {/* Affichage d'erreur sous la ligne si le domaine signale une anomalie */}
                  {aErreur && (
                    <tr className="bg-[var(--danger-tint)] border-l-4 border-l-[var(--danger)]">
                      <td colSpan={6} className="px-6 py-2 text-[0.9375rem] text-[var(--danger)] font-medium" aria-live="polite">
                        {ligne.erreur}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pied du tableau */}
      <div className="flex items-center px-6 h-[2.8125rem] border-t border-[var(--border)] text-[1.0625rem] text-[var(--text-2)] bg-[var(--surface)]">
        Affichage de 1 à {lignes.length} employé{lignes.length > 1 ? 's' : ''}
      </div>
    </div>
  );
}
