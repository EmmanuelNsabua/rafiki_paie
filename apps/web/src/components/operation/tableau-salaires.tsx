'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import type { LignePaieCalculee, OperationPaie, Employe } from '@rafiki/contrat';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import {
  formaterMontant,
  normaliserSaisieDecimale,
  totalJoursAbsences,
  calculerPrestation,
} from '@/lib/format';
import { Tooltip } from '@/components/ui/tooltip';
import { DropdownMenu } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { HelpCircle, Clock, MoreHorizontal, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DialogueBulletinIndividuel } from './dialogue-bulletin-individuel';
import { FicheEmployeSheet } from '@/components/employes/fiche-employe-sheet';

export interface TableauSalairesProps {
  lignes: LignePaieCalculee[];
  estTerminee: boolean;
  joursOuvrables?: number;
  nbEmployesNonInclus?: number;
  operation?: OperationPaie;
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
      id={idCellule}
      data-cellule={idCellule}
      data-testid={idCellule}
      className={cn(
        'relative flex items-center justify-end px-[0.571rem] py-[0.286rem] rounded-[0.286rem] min-h-[2.286rem] transition-colors',
        !estTerminee &&
          !actif &&
          'hover:bg-[var(--hover)] hover:ring-1 hover:ring-[var(--border)] cursor-text',
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
            id={idCellule ? `input-${idCellule}` : undefined}
            data-input={idCellule}
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
            className="w-full text-right bg-transparent outline-none ring-2 ring-[var(--primary)] rounded-[0.286rem] px-[0.571rem] py-[0.143rem] text-[1rem] font-medium font-mono tabular-nums pr-[1.429rem]"
            autoFocus
          />
          <span className="absolute right-[0.429rem] text-[var(--text-2)] text-[0.857rem] pointer-events-none">
            $
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-[0.286rem]">
          {sauvegardeEnCours && (
            <span className="w-[0.429rem] h-[0.429rem] rounded-full bg-[var(--primary)] animate-ping mr-[0.286rem]" />
          )}
          <span
            className={cn(
              'font-mono tabular-nums text-[1rem] font-medium',
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
  joursOuvrables = 22,
  nbEmployesNonInclus = 0,
  operation,
  onAjouterNouveauxEmployes,
  onModifierLigne,
  onOuvrirAbsences,
}: TableauSalairesProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [chargementAjout, setChargementAjout] = React.useState(false);
  const [ligneBulletin, setLigneBulletin] = React.useState<LignePaieCalculee | null>(null);
  const [employeAModifier, setEmployeAModifier] = React.useState<Employe | null>(null);
  const [ficheEmployeOuverte, setFicheEmployeOuverte] = React.useState(false);

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
    <div className="rounded-[0.571rem] bg-[var(--surface)] border border-[var(--border)] shadow-xs overflow-hidden">
      {/* Bandeau de titre du tableau */}
      <div className="flex flex-wrap items-center justify-between gap-[0.857rem] px-[1.143rem] h-[3.143rem] border-b border-[var(--border)]">
        <h2 className="text-[1.143rem] font-semibold text-[var(--text)] tracking-tight">
          Salaires des employés
        </h2>

        <div className="flex items-center gap-[0.857rem]">
          {nbEmployesNonInclus > 0 && !estTerminee && (
            <Button
              type="button"
              variant="outline"
              onClick={handleAjouterNouveaux}
              disabled={chargementAjout}
              className="h-[2.286rem] text-[0.857rem] font-medium border-[var(--primary)] text-[var(--primary-strong)] hover:bg-[var(--primary-tint)] flex items-center gap-[0.357rem] cursor-pointer"
            >
              <UserPlus className="w-[1rem] h-[1rem]" />
              <span>
                {chargementAjout
                  ? 'Ajout en cours…'
                  : `Ajouter ${nbEmployesNonInclus} nouveau${nbEmployesNonInclus > 1 ? 'x' : ''} employé${nbEmployesNonInclus > 1 ? 's' : ''}`}
              </span>
            </Button>
          )}

          <span className="text-[0.857rem] text-[var(--text-2)]">
            {lignes.length} employé{lignes.length > 1 ? 's' : ''} affiché
            {lignes.length > 1 ? 's' : ''} · Montants en dollars ($)
          </span>
        </div>
      </div>

      {/* Grille de données */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="h-[2.571rem] bg-[var(--table-head)] border-b border-[var(--border)] text-[0.857rem] font-medium text-[var(--text-2)]">
              <th className="w-[3.5rem] px-[0.714rem] text-center">N°</th>
              <th className="min-w-[14rem] px-[0.857rem]">Employé</th>
              <th className="w-[8.5rem] px-[0.714rem] text-right">
                <div className="inline-flex items-center gap-[0.286rem] justify-end">
                  <span>HS / Primes ($)</span>
                  <Tooltip content="Heures supplémentaires et primes : somme qui s'ajoute au salaire.">
                    <button
                      type="button"
                      aria-label="Aide sur HS et Primes"
                      className="text-[var(--text-2)] hover:text-[var(--text)] transition-colors cursor-help"
                    >
                      <HelpCircle className="w-[0.857rem] h-[0.857rem]" />
                    </button>
                  </Tooltip>
                </div>
              </th>
              <th className="w-[8.5rem] px-[0.714rem] text-right">
                <div className="inline-flex items-center gap-[0.286rem] justify-end">
                  <span>Retrait ($)</span>
                  <Tooltip content="Avance déjà versée ou retenue convenue : somme qui est retirée du salaire.">
                    <button
                      type="button"
                      aria-label="Aide sur Retrait"
                      className="text-[var(--text-2)] hover:text-[var(--text)] transition-colors cursor-help"
                    >
                      <HelpCircle className="w-[0.857rem] h-[0.857rem]" />
                    </button>
                  </Tooltip>
                </div>
              </th>
              <th className="w-[7.5rem] px-[0.714rem] text-right">
                <div className="inline-flex items-center gap-[0.286rem] justify-end">
                  <span>Prestation</span>
                  <Tooltip content="Jours effectivement prestés : jours ouvrables du mois moins les absences (maladie, congés, injustifiées).">
                    <button
                      type="button"
                      aria-label="Aide sur Prestation"
                      className="text-[var(--text-2)] hover:text-[var(--text)] transition-colors cursor-help"
                    >
                      <HelpCircle className="w-[0.857rem] h-[0.857rem]" />
                    </button>
                  </Tooltip>
                </div>
              </th>
              <th className="w-[9.5rem] px-[0.857rem] text-right">Salaire net ($)</th>
              <th className="w-[4rem] px-[0.714rem] text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)] text-[1rem]">
            {lignes.map((ligne, index) => {
              const aErreur = Boolean(ligne.erreur);
              const nomComplet = [ligne.nom, ligne.postnom, ligne.prenom].filter(Boolean).join(' ');
              const totalAbs = totalJoursAbsences(
                ligne.jours_maladie,
                ligne.jours_conge,
                ligne.jours_absence
              );
              const aDesAbsences = totalAbs !== '0';
              const prestation = calculerPrestation(
                joursOuvrables,
                ligne.jours_maladie,
                ligne.jours_conge,
                ligne.jours_absence
              );

              return (
                <React.Fragment key={ligne.id}>
                  <tr
                    className={cn(
                      'h-[3.143rem] transition-colors',
                      aErreur
                        ? 'bg-[var(--danger-tint)] border-l-4 border-l-[var(--danger)]'
                        : 'hover:bg-[var(--hover)]'
                    )}
                  >
                    {/* N° */}
                    <td className="px-[0.714rem] text-center text-[var(--text-2)] font-mono">
                      {String(ligne.numero).padStart(2, '0')}
                    </td>

                    {/* Employé (sans badge d'absences encombrant) */}
                    <td className="px-[0.857rem] font-medium text-[var(--text)]">
                      <span className="truncate">{nomComplet}</span>
                    </td>

                    {/* HS / Primes */}
                    <td className="px-[0.714rem] text-right">
                      <CelluleEditable
                        idCellule={`cellule-hs-${index}`}
                        valeurInitiale={ligne.hs || '0'}
                        estTerminee={estTerminee}
                        onEnregistrer={(val) =>
                          executerLigneModif(ligne.id, { hs: val }).then(() => {})
                        }
                        onNaviguerSuivant={() => focusCellule(index + 1, 'hs')}
                      />
                    </td>

                    {/* Retrait */}
                    <td className="px-[0.714rem] text-right">
                      <CelluleEditable
                        idCellule={`cellule-retrait-${index}`}
                        valeurInitiale={ligne.retrait || '0'}
                        estTerminee={estTerminee}
                        onEnregistrer={(val) =>
                          executerLigneModif(ligne.id, { retrait: val }).then(() => {})
                        }
                        onNaviguerSuivant={() => focusCellule(index + 1, 'retrait')}
                      />
                    </td>

                    {/* Prestation (jours ouvrables - absences) */}
                    <td className="px-[0.714rem] text-right">
                      <button
                        type="button"
                        onClick={() => onOuvrirAbsences(ligne)}
                        title="Modifier les absences"
                        className={cn(
                          'font-mono tabular-nums text-[0.929rem] px-2 py-0.5 rounded-[4px] transition-colors cursor-pointer inline-flex items-center gap-1',
                          aDesAbsences
                            ? 'font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50'
                            : 'text-[var(--text)] hover:bg-[var(--hover)]'
                        )}
                      >
                        <span>{prestation}&nbsp;j</span>
                      </button>
                    </td>

                    {/* Salaire net */}
                    <td className="px-[0.857rem] text-right font-semibold text-[var(--text)] font-mono tabular-nums">
                      {formaterMontant(ligne.net_global, 2)}
                    </td>

                    {/* Action */}
                    <td className="px-[0.714rem] text-center">
                      <DropdownMenu
                        align="right"
                        trigger={
                          <button
                            type="button"
                            aria-label={`Actions pour ${nomComplet}`}
                            className="w-[2.286rem] h-[2.286rem] inline-flex items-center justify-center rounded-[0.429rem] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--hover)] text-[var(--text-2)] hover:text-[var(--text)] transition-colors cursor-pointer"
                          >
                            <MoreHorizontal className="w-[1.143rem] h-[1.143rem]" />
                          </button>
                        }
                        items={[
                          {
                            label: 'Voir la fiche',
                            onClick: () => setLigneBulletin(ligne),
                          },
                          {
                            label: 'Modifier',
                            onClick: () => {
                              setEmployeAModifier({
                                id: ligne.employe_id,
                                numero: ligne.numero,
                                nom: ligne.nom,
                                postnom: ligne.postnom || '',
                                prenom: ligne.prenom || '',
                                fonction: ligne.fonction || '',
                                telephone: ligne.telephone || '',
                                code_banque: ligne.code_banque || '',
                                salaire_base: String(ligne.salaire_base),
                                actif: 1,
                                version: 1,
                                mis_a_jour_le: new Date().toISOString(),
                                supprime_le: null,
                              });
                              setFicheEmployeOuverte(true);
                            },
                          },
                          {
                            label: 'Absences',
                            onClick: () => onOuvrirAbsences(ligne),
                          },
                        ]}
                      />
                    </td>
                  </tr>

                  {/* Affichage d'erreur sous la ligne si le domaine signale une anomalie */}
                  {aErreur && (
                    <tr className="bg-[var(--danger-tint)] border-l-4 border-l-[var(--danger)]">
                      <td
                        colSpan={7}
                        className="px-[1.143rem] py-[0.429rem] text-[0.857rem] text-[var(--danger)] font-medium"
                        aria-live="polite"
                      >
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
      <div className="flex items-center px-[1.143rem] h-[2.571rem] border-t border-[var(--border)] text-[0.857rem] text-[var(--text-2)] bg-[var(--surface)]">
        Affichage de 1 à {lignes.length} employé{lignes.length > 1 ? 's' : ''}
      </div>

      {/* Overlay Bulletin de paie individuel */}
      <DialogueBulletinIndividuel
        ouvert={Boolean(ligneBulletin)}
        onOpenChange={(ouvert) => {
          if (!ouvert) setLigneBulletin(null);
        }}
        ligne={ligneBulletin}
        operation={
          operation ||
          ({
            annee: new Date().getFullYear(),
            mois: new Date().getMonth() + 1,
            jours_ouvrables: joursOuvrables,
          } as any)
        }
      />

      {/* Panneau latéral de modification de l'employé */}
      <FicheEmployeSheet
        open={ficheEmployeOuverte}
        onOpenChange={(ouvert) => {
          setFicheEmployeOuverte(ouvert);
          if (!ouvert) setEmployeAModifier(null);
        }}
        employe={employeAModifier}
        onEnregistrer={async (donnees) => {
          if (employeAModifier) {
            await api.employes.modifier({
              id: employeAModifier.id,
              nom: donnees.nom,
              postnom: donnees.postnom,
              prenom: donnees.prenom,
              fonction: donnees.fonction,
              telephone: donnees.telephone,
              code_banque: donnees.code_banque,
              salaire_base: donnees.salaire_base,
              actif: donnees.actif,
            });
            toast.success(`Fiche de ${donnees.nom} mise à jour avec succès.`);
            queryClient.invalidateQueries();
          }
        }}
      />
    </div>
  );
}
