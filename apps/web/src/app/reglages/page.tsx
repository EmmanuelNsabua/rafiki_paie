'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Parametre, Journal } from '@rafiki/contrat';
import { formaterDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import { Settings, History, Sliders, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ReglagesPage() {
  const queryClient = useQueryClient();
  const [ongletActif, setOngletActif] = React.useState<'parametres' | 'journal'>('parametres');

  // État formulaire paramètres
  const [joursOuvrables, setJoursOuvrables] = React.useState('22');
  const [diviseurRetenue, setDiviseurRetenue] = React.useState('3');
  const [uniteArrondi, setUniteArrondi] = React.useState('10');
  const [codeBanqueDefaut, setCodeBanqueDefaut] = React.useState('');

  // Filtre journal d'activité
  const [filtreEntite, setFiltreEntite] = React.useState<string>('tous');

  // 1. Paramètres
  const { data: parametres, isLoading: chargementParametres } = useQuery({
    queryKey: ['parametres'],
    queryFn: () => api.parametres.lire(),
  });

  React.useEffect(() => {
    if (parametres) {
      setJoursOuvrables(String(parametres.jours_ouvrables_defaut));
      setDiviseurRetenue(String(parametres.diviseur_retenue));
      setUniteArrondi(String(parametres.unite_arrondi));
      setCodeBanqueDefaut(parametres.code_banque_defaut || '');
    }
  }, [parametres]);

  // 2. Journal d'activité (100 dernières actions)
  const { data: actionsJournal = [], isLoading: chargementJournal } = useQuery({
    queryKey: ['journal-activite', filtreEntite],
    queryFn: () =>
      api.journal.lister({
        limite: 100,
        entite: filtreEntite === 'tous' ? undefined : filtreEntite,
      }),
  });

  // Mutation mise à jour paramètres
  const mutationParametres = useMutation({
    mutationFn: (donnees: Parameters<typeof api.parametres.modifier>[0]) =>
      api.parametres.modifier(donnees),
    onSuccess: (paramsRecus) => {
      queryClient.setQueryData(['parametres'], paramsRecus);
      queryClient.invalidateQueries({ queryKey: ['journal-activite'] });
      toast.success('Réglages enregistrés avec succès');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Erreur lors de l’enregistrement des réglages');
    },
  });

  const handleEnregistrerParametres = async (e: React.FormEvent) => {
    e.preventDefault();
    const jOuv = parseInt(joursOuvrables, 10);
    const div = parseInt(diviseurRetenue, 10);
    const arrondi = parseInt(uniteArrondi, 10);

    if (isNaN(jOuv) || jOuv < 1) {
      toast.error('Les jours ouvrables par défaut doivent être supérieurs ou égaux à 1');
      return;
    }
    if (isNaN(div) || div < 1) {
      toast.error('Le diviseur de retenue doit être supérieur ou égal à 1');
      return;
    }
    if (isNaN(arrondi) || arrondi < 1) {
      toast.error('L’unité d’arrondi doit être supérieure ou égale à 1');
      return;
    }

    await mutationParametres.mutateAsync({
      jours_ouvrables_defaut: jOuv,
      diviseur_retenue: div,
      unite_arrondi: arrondi,
      code_banque_defaut: codeBanqueDefaut.trim() || undefined,
    });
  };

  const formaterHorodatage = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      const datePart = formaterDate(d);
      const heurePart = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      return `${datePart} à ${heurePart}`;
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-[1.143rem]">
      {/* 1. Carte d'en-tête avec onglets en pastille */}
      <div className="flex flex-col gap-[1rem] p-[1.143rem] rounded-[0.571rem] bg-[var(--surface)] border border-[var(--border)] shadow-xs">
        <h1 className="text-[1.714rem] font-semibold text-[var(--text)] leading-[2.286rem] tracking-tight">
          Réglages
        </h1>

        <div className="flex items-center gap-[0.429rem] p-[0.286rem] rounded-full bg-[var(--page)] border border-[var(--border)] w-fit">
          <button
            type="button"
            onClick={() => setOngletActif('parametres')}
            className={cn(
              'flex items-center gap-[0.429rem] h-[2.286rem] px-[1rem] rounded-full text-[0.929rem] font-medium transition-colors cursor-pointer',
              ongletActif === 'parametres'
                ? 'bg-[var(--primary)] text-white shadow-xs'
                : 'text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--hover)]'
            )}
          >
            <Sliders className="w-[1rem] h-[1rem]" />
            <span>Paramètres</span>
          </button>

          <button
            type="button"
            onClick={() => setOngletActif('journal')}
            className={cn(
              'flex items-center gap-[0.429rem] h-[2.286rem] px-[1rem] rounded-full text-[0.929rem] font-medium transition-colors cursor-pointer',
              ongletActif === 'journal'
                ? 'bg-[var(--primary)] text-white shadow-xs'
                : 'text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--hover)]'
            )}
          >
            <History className="w-[1rem] h-[1rem]" />
            <span>Journal d’activité</span>
          </button>
        </div>
      </div>

      {/* 2. Contenu de l'onglet actif */}
      {ongletActif === 'parametres' ? (
        <div className="rounded-[0.571rem] bg-[var(--surface)] border border-[var(--border)] shadow-xs p-[1.429rem] max-w-xl">
          {chargementParametres ? (
            <div className="space-y-[0.857rem]">
              <Skeleton className="h-[2.286rem] w-full" />
              <Skeleton className="h-[2.286rem] w-full" />
              <Skeleton className="h-[2.286rem] w-full" />
            </div>
          ) : (
            <form onSubmit={handleEnregistrerParametres} className="space-y-[1.143rem]">
              {/* Jours ouvrables par défaut */}
              <div className="space-y-[0.286rem]">
                <Label
                  htmlFor="reglage-jours"
                  className="text-[0.857rem] font-medium text-[var(--text)]"
                >
                  Jours ouvrables par défaut
                </Label>
                <Input
                  id="reglage-jours"
                  type="number"
                  min="1"
                  max="31"
                  value={joursOuvrables}
                  onChange={(e) => setJoursOuvrables(e.target.value)}
                  className="h-[2.286rem] text-[1rem]"
                />
                <p className="text-[0.786rem] text-[var(--text-2)]">
                  Proposé automatiquement lors de la création d’une nouvelle opération mensuelle.
                </p>
              </div>

              {/* Diviseur de retenue */}
              <div className="space-y-[0.286rem]">
                <Label
                  htmlFor="reglage-diviseur"
                  className="text-[0.857rem] font-medium text-[var(--text)]"
                >
                  Retenue maladie et congé (1 / X du salaire journalier)
                </Label>
                <div className="flex items-center gap-[0.571rem]">
                  <span className="text-[0.929rem] text-[var(--text-2)] font-mono">1 /</span>
                  <Input
                    id="reglage-diviseur"
                    type="number"
                    min="1"
                    max="100"
                    value={diviseurRetenue}
                    onChange={(e) => setDiviseurRetenue(e.target.value)}
                    className="h-[2.286rem] text-[1rem] w-[5rem]"
                  />
                  <span className="text-[0.857rem] text-[var(--text-2)]">
                    du salaire journalier par jour
                  </span>
                </div>
                <p className="text-[0.786rem] text-[var(--text-2)]">
                  Par défaut 3 (soit 1/3 retenu par jour pour maladie ou congé de circonstance).
                </p>
              </div>

              {/* Unité d'arrondi */}
              <div className="space-y-[0.286rem]">
                <Label
                  htmlFor="reglage-arrondi"
                  className="text-[0.857rem] font-medium text-[var(--text)]"
                >
                  Virement arrondi au multiple de ($)
                </Label>
                <Input
                  id="reglage-arrondi"
                  type="number"
                  min="1"
                  max="1000"
                  value={uniteArrondi}
                  onChange={(e) => setUniteArrondi(e.target.value)}
                  className="h-[2.286rem] text-[1rem]"
                />
                <p className="text-[0.786rem] text-[var(--text-2)]">
                  Arrondi à la dizaine la plus proche (ex: 10 $). La moitié monte.
                </p>
              </div>

              {/* Code banque proposé */}
              <div className="space-y-[0.286rem]">
                <Label
                  htmlFor="reglage-code-banque"
                  className="text-[0.857rem] font-medium text-[var(--text)]"
                >
                  Code banque proposé aux nouveaux employés
                </Label>
                <Input
                  id="reglage-code-banque"
                  type="text"
                  value={codeBanqueDefaut}
                  onChange={(e) => setCodeBanqueDefaut(e.target.value)}
                  placeholder="Ex: 001"
                  className="h-[2.286rem] text-[1rem]"
                />
                <p className="text-[0.786rem] text-[var(--text-2)]">
                  Pré-rempli lors de la création d’une fiche employé (peut être modifié ou effacé).
                </p>
              </div>

              <div className="pt-[0.857rem] border-t border-[var(--border)] flex items-center justify-between">
                <p className="text-[0.786rem] text-[var(--text-2)] italic">
                  Ces réglages s’appliquent aux prochaines opérations.
                </p>
                <Button
                  type="submit"
                  disabled={mutationParametres.isPending}
                  className="h-[2.429rem] px-[1rem] rounded-[0.429rem] bg-[var(--primary)] hover:bg-[var(--primary-strong)] text-white text-[0.929rem] font-semibold cursor-pointer shadow-xs"
                >
                  {mutationParametres.isPending ? 'Enregistrement…' : 'Enregistrer'}
                </Button>
              </div>
            </form>
          )}
        </div>
      ) : (
        /* Journal d'activité */
        <div className="rounded-[0.571rem] bg-[var(--surface)] border border-[var(--border)] shadow-xs overflow-hidden">
          {/* Bandeau de titre du journal */}
          <div className="flex flex-wrap items-center justify-between gap-[0.857rem] px-[1.143rem] h-[3.143rem] border-b border-[var(--border)]">
            <h2 className="text-[1.143rem] font-semibold text-[var(--text)] tracking-tight">
              Journal d’activité
            </h2>

            <div className="flex items-center gap-[0.857rem]">
              {/* Filtre par entité */}
              <div className="flex items-center gap-[0.429rem]">
                <Filter className="w-[1rem] h-[1rem] text-[var(--text-2)]" />
                <select
                  value={filtreEntite}
                  onChange={(e) => setFiltreEntite(e.target.value)}
                  className="h-[2.286rem] px-[0.714rem] rounded-[0.429rem] bg-[var(--page)] border border-[var(--border)] text-[0.857rem] text-[var(--text)] outline-none cursor-pointer"
                >
                  <option value="tous">Tous les types d’action</option>
                  <option value="employe">Employés</option>
                  <option value="operation_paie">Opérations</option>
                  <option value="ligne_paie">Lignes de paie</option>
                  <option value="parametre">Paramètres</option>
                </select>
              </div>

              <span className="text-[0.857rem] text-[var(--text-2)]">Dernières 100 actions</span>
            </div>
          </div>

          {/* Grille du journal */}
          {chargementJournal ? (
            <div className="p-[1.143rem] space-y-[0.571rem]">
              <Skeleton className="h-[2.286rem] w-full" />
              <Skeleton className="h-[2.286rem] w-full" />
              <Skeleton className="h-[2.286rem] w-full" />
            </div>
          ) : actionsJournal.length === 0 ? (
            <div className="p-[2.857rem] text-center text-[var(--text-2)] text-[0.857rem]">
              Aucune action enregistrée pour le moment.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="h-[2.571rem] bg-[var(--table-head)] border-b border-[var(--border)] text-[0.857rem] font-medium text-[var(--text-2)]">
                    <th className="px-[1.143rem] w-[14rem]">Date</th>
                    <th className="px-[1.143rem] w-[10rem]">Action</th>
                    <th className="px-[1.143rem] w-[10rem]">Concerne</th>
                    <th className="px-[1.143rem]">Détail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] text-[1rem]">
                  {actionsJournal.map((item) => (
                    <tr
                      key={item.id}
                      className="h-[3.143rem] hover:bg-[var(--hover)] transition-colors"
                    >
                      <td className="px-[1.143rem] text-[var(--text-2)] font-mono text-[0.857rem]">
                        {formaterHorodatage(item.horodatage)}
                      </td>
                      <td className="px-[1.143rem] font-medium text-[var(--text)]">
                        <span className="inline-flex items-center px-[0.571rem] py-[0.143rem] rounded-full bg-[var(--hover)] text-[0.786rem] font-medium border border-[var(--border)]">
                          {item.action}
                        </span>
                      </td>
                      <td className="px-[1.143rem] text-[var(--text)] capitalize font-mono text-[0.857rem]">
                        {item.entite}
                      </td>
                      <td className="px-[1.143rem] text-[var(--text-2)] text-[0.857rem]">
                        {item.detail || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pied du journal */}
          <div className="flex items-center px-[1.143rem] h-[2.571rem] border-t border-[var(--border)] text-[0.857rem] text-[var(--text-2)] bg-[var(--surface)]">
            Affichage de {actionsJournal.length} action{actionsJournal.length > 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  );
}
