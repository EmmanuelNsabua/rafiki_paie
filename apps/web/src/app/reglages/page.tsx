'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formaterDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/sonner';
import {
  History,
  Sliders,
  Filter,
  Plus,
  Minus,
  Database,
  Download,
  Upload,
  RotateCcw,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepperLigneProps {
  id: string;
  titre: string;
  description: string;
  valeur: string;
  onChange: (val: string) => void;
  onIncrement: () => void;
  onDecrement: () => void;
}

function StepperLigne({
  id,
  titre,
  description,
  valeur,
  onChange,
  onIncrement,
  onDecrement,
}: StepperLigneProps) {
  return (
    <div className="flex items-center justify-between gap-[1.143rem] py-[0.571rem]">
      {/* Intitulé & Description */}
      <div className="space-y-[0.286rem] flex-1 pr-[1.143rem]">
        <Label
          htmlFor={id}
          className="text-[0.929rem] font-semibold text-[var(--text)] cursor-pointer"
        >
          {titre}
        </Label>
        <p className="text-[0.786rem] text-[var(--text-2)] leading-relaxed">{description}</p>
      </div>

      {/* Stepper : [ + ] [ Valeur ] [ - ] */}
      <div className="flex items-center rounded-[0.429rem] border border-[var(--border)] bg-[var(--carte)] p-[2px] shadow-xs shrink-0">
        <button
          type="button"
          onClick={onIncrement}
          aria-label="Augmenter"
          className="w-[2.143rem] h-[2.143rem] rounded-[0.286rem] bg-[#2563eb] hover:bg-blue-700 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <Plus className="w-[14px] h-[14px] stroke-[2.5]" />
        </button>

        <input
          id={id}
          type="text"
          value={valeur}
          onChange={(e) => onChange(e.target.value)}
          className="w-[4.857rem] h-[2.143rem] text-center font-medium text-[0.929rem] text-[var(--text)] bg-transparent focus:border-none focus:outline-none tabular-nums font-mono"
        />

        <button
          type="button"
          onClick={onDecrement}
          aria-label="Diminuer"
          className="w-[2.143rem] h-[2.143rem] rounded-[0.286rem] border border-blue-200 bg-white hover:bg-blue-50 active:scale-95 text-[#2563eb] flex items-center justify-center transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <Minus className="w-[14px] h-[14px] stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
}

export default function ReglagesPage() {
  const queryClient = useQueryClient();
  const [ongletActif, setOngletActif] = React.useState<'parametres' | 'journal' | 'donnees'>(
    'parametres'
  );

  // États pour Sauvegarde, Restauration Point Zéro & Import .db
  const [chargementSauvegarde, setChargementSauvegarde] = React.useState(false);
  const [chargementImportDb, setChargementImportDb] = React.useState(false);
  const [dialogueResetOuvert, setDialogueResetOuvert] = React.useState(false);
  const [confirmationResetTexte, setConfirmationResetTexte] = React.useState('');
  const [chargementReset, setChargementReset] = React.useState(false);

  // Version dynamique de l'application
  const { data: infosFenetre } = useQuery({
    queryKey: ['infos-fenetre'],
    queryFn: () => api.fenetre.lirePreferences(),
  });
  const versionApp = infosFenetre?.version || '0.1.2';

  const handleExporterSauvegarde = async () => {
    setChargementSauvegarde(true);
    try {
      const res = await api.sauvegarde.choisirDossierExport();
      if (!res.annule && res.chemin) {
        toast.success(`Sauvegarde exportée avec succès : ${res.chemin}`);
      }
    } catch (err: any) {
      toast.error(`Échec de sauvegarde : ${err?.message || err}`);
    } finally {
      setChargementSauvegarde(false);
    }
  };

  const handleImporterDb = async () => {
    setChargementImportDb(true);
    try {
      const res = await api.sauvegarde.importerFichierDialog();
      if (!res.annule && res.chemin) {
        toast.success('Base de données importée avec succès. Redémarrage de l’application…');
        setTimeout(() => {
          api.fenetre.redemarrer().catch(() => {
            queryClient.invalidateQueries();
          });
        }, 1200);
      }
    } catch (err: any) {
      toast.error(err?.message || String(err));
    } finally {
      setChargementImportDb(false);
    }
  };

  const handleReinitialiserPointZero = async () => {
    if (confirmationResetTexte.trim() !== 'Supprimer toutes les données') {
      toast.error('Veuillez saisir exactement « Supprimer toutes les données » pour confirmer.');
      return;
    }
    setChargementReset(true);
    try {
      await api.sauvegarde.reinitialiserPointZero();
      toast.success('La base de données a été restaurée au point zéro.');
      setDialogueResetOuvert(false);
      setConfirmationResetTexte('');
      queryClient.invalidateQueries();
    } catch (err: any) {
      toast.error(err?.message || String(err));
    } finally {
      setChargementReset(false);
    }
  };

  // État formulaire paramètres
  const [joursOuvrables, setJoursOuvrables] = React.useState('22');
  const [retenuePourcentage, setRetenuePourcentage] = React.useState('30,0%');
  const [uniteArrondi, setUniteArrondi] = React.useState('10');
  const [codeBanqueDefaut, setCodeBanqueDefaut] = React.useState('840');

  // Filtre journal d'activité
  const [filtreEntite, setFiltreEntite] = React.useState<string>('tous');

  // Conversion diviseur <-> affichage (3 -> "30,0%", ou fraction "1/3")
  const diviseurEnPourcentage = (diviseur: number): string => {
    if (diviseur === 3) return '30,0%';
    if (diviseur === 1) return '100,0%';
    if (diviseur === 2) return '50,0%';
    if (diviseur === 4) return '25,0%';
    if (diviseur === 5) return '20,0%';
    const pct = 100 / diviseur;
    return `${pct.toFixed(1).replace('.', ',')}%`;
  };

  const parserPourcentageOuFraction = (inputStr: string): number => {
    const str = inputStr.trim().replace('%', '');

    // Cas fraction : ex. "1/3", "1 / 3"
    if (str.includes('/')) {
      const [numStr, denStr] = str.split('/');
      const num = parseFloat(numStr.replace(',', '.'));
      const den = parseFloat(denStr.replace(',', '.'));
      if (!isNaN(num) && !isNaN(den) && num > 0 && den > 0) {
        return Math.max(1, Math.round(den / num));
      }
    }

    // Cas nombre : ex. "30,0", "30", "33,3", "0,03"
    const val = parseFloat(str.replace(',', '.'));
    if (isNaN(val) || val <= 0) return 3;

    // Tolérance 0,03 ou 0.03
    if (val <= 0.1) return 3;

    // Si l'utilisateur saisit directement le diviseur 3 (comme 1/3)
    if (val === 3) return 3;

    // Si l'utilisateur saisit 30, 30.0, 33, 33.3... (autour de 30% - 33.3%)
    if (val >= 28 && val <= 35) return 3;

    // Pourcentage général (ex: 50 -> 2, 25 -> 4, 100 -> 1, 20 -> 5)
    return Math.max(1, Math.round(100 / val));
  };

  // 1. Paramètres
  const { data: parametres, isLoading: chargementParametres } = useQuery({
    queryKey: ['parametres'],
    queryFn: () => api.parametres.lire(),
  });

  React.useEffect(() => {
    if (parametres) {
      setJoursOuvrables(String(parametres.jours_ouvrables_defaut));
      setRetenuePourcentage(diviseurEnPourcentage(parametres.diviseur_retenue));
      setUniteArrondi(String(parametres.unite_arrondi));
      setCodeBanqueDefaut(parametres.code_banque_defaut || '840');
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
    const arrondi = parseInt(uniteArrondi, 10);

    // Analyse du pourcentage ou de la fraction de retenue (ex: "30,0%", "30%", "1/3")
    const diviseur = parserPourcentageOuFraction(retenuePourcentage);

    if (isNaN(jOuv) || jOuv < 1) {
      toast.error('Les jours ouvrables par défaut doivent être supérieurs ou égaux à 1');
      return;
    }
    if (isNaN(arrondi) || arrondi < 1) {
      toast.error('L’unité d’arrondi doit être supérieure ou égale à 1');
      return;
    }

    await mutationParametres.mutateAsync({
      jours_ouvrables_defaut: jOuv,
      diviseur_retenue: diviseur,
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
      {/* 1. Carte d'en-tête avec titre à gauche et onglets en pastille à droite */}
      <div className="flex items-center justify-between p-[1.143rem] rounded-[0.571rem] bg-[var(--surface)] border border-[var(--border)] shadow-xs">
        <h1 className="text-[1.714rem] font-bold text-[var(--text)] leading-[2.286rem] tracking-tight">
          Réglages
        </h1>

        <div className="flex items-center gap-[0.286rem] p-[0.286rem] rounded-full bg-[var(--page)] border border-[var(--border)]">
          <button
            type="button"
            onClick={() => setOngletActif('parametres')}
            className={cn(
              'flex items-center gap-[0.429rem] h-[2.286rem] px-[1.143rem] rounded-full text-[0.857rem] font-medium transition-colors cursor-pointer',
              ongletActif === 'parametres'
                ? 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-xs'
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
              'flex items-center gap-[0.429rem] h-[2.286rem] px-[1.143rem] rounded-full text-[0.857rem] font-medium transition-colors cursor-pointer',
              ongletActif === 'journal'
                ? 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-xs'
                : 'text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--hover)]'
            )}
          >
            <History className="w-[1rem] h-[1rem]" />
            <span>Journal d’activité</span>
          </button>

          <button
            type="button"
            onClick={() => setOngletActif('donnees')}
            className={cn(
              'flex items-center gap-[0.429rem] h-[2.286rem] px-[1.143rem] rounded-full text-[0.857rem] font-medium transition-colors cursor-pointer',
              ongletActif === 'donnees'
                ? 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-xs'
                : 'text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--hover)]'
            )}
          >
            <Database className="w-[1rem] h-[1rem]" />
            <span>Données &amp; Mises à jour</span>
          </button>
        </div>
      </div>

      {/* 2. Contenu de l'onglet actif */}
      {ongletActif === 'parametres' ? (
        <div className="rounded-[0.571rem] bg-[var(--surface)] border border-[var(--border)] shadow-xs p-[1.714rem]">
          {chargementParametres ? (
            <div className="space-y-[1.143rem]">
              <Skeleton className="h-[3.429rem] w-full" />
              <Skeleton className="h-[3.429rem] w-full" />
              <Skeleton className="h-[3.429rem] w-full" />
              <Skeleton className="h-[3.429rem] w-full" />
            </div>
          ) : (
            <form onSubmit={handleEnregistrerParametres} className="space-y-[1.143rem]">
              {/* Ligne 1 : Jours ouvrables par défaut */}
              <StepperLigne
                id="reglage-jours"
                titre="Jours ouvrables par défaut"
                description="Proposé automatiquement lors de la création d’une nouvelle opération mensuelle."
                valeur={joursOuvrables}
                onChange={setJoursOuvrables}
                onIncrement={() =>
                  setJoursOuvrables((prev) => String(Math.min(31, (parseInt(prev, 10) || 22) + 1)))
                }
                onDecrement={() =>
                  setJoursOuvrables((prev) => String(Math.max(1, (parseInt(prev, 10) || 22) - 1)))
                }
              />

              {/* Ligne 2 : Retenue maladie et congé (pourcentage du salaire journalier) */}
              <StepperLigne
                id="reglage-diviseur"
                titre="Retenue maladie et congé (pourcentage du salaire journalier)"
                description="Par défaut 3 (soit 1/3 retenu par jour pour maladie ou congé de circonstance)."
                valeur={retenuePourcentage}
                onChange={setRetenuePourcentage}
                onIncrement={() => {
                  setRetenuePourcentage((prev) => {
                    if (prev.includes('/')) {
                      const cur = parserPourcentageOuFraction(prev);
                      const next = Math.max(1, cur - 1);
                      return `1/${next}`;
                    }
                    const clean = prev.replace('%', '').replace(',', '.').trim();
                    const num = parseFloat(clean);
                    if (isNaN(num)) return '30,0%';
                    const next = Math.min(100, Math.round(num + 5));
                    return `${next},0%`;
                  });
                }}
                onDecrement={() => {
                  setRetenuePourcentage((prev) => {
                    if (prev.includes('/')) {
                      const cur = parserPourcentageOuFraction(prev);
                      const next = cur + 1;
                      return `1/${next}`;
                    }
                    const clean = prev.replace('%', '').replace(',', '.').trim();
                    const num = parseFloat(clean);
                    if (isNaN(num)) return '30,0%';
                    const next = Math.max(5, Math.round(num - 5));
                    return `${next},0%`;
                  });
                }}
              />

              {/* Ligne 3 : Virement arrondi au multiple de ($) */}
              <StepperLigne
                id="reglage-arrondi"
                titre="Virement arrondi au multiple de ($)"
                description="Arrondi à la dizaine la plus proche (ex: 10 $). La moitié monte."
                valeur={uniteArrondi}
                onChange={setUniteArrondi}
                onIncrement={() =>
                  setUniteArrondi((prev) => String((parseInt(prev, 10) || 10) + 10))
                }
                onDecrement={() =>
                  setUniteArrondi((prev) =>
                    String(Math.max(1, (parseInt(prev, 10) || 10) - 10 || 1))
                  )
                }
              />

              {/* Ligne 4 : Code banque proposé aux nouveaux employés */}
              <StepperLigne
                id="reglage-code-banque"
                titre="Code banque proposé aux nouveaux employés"
                description="Pré-rempli lors de la création d’une fiche employé (peut être modifié ou effacé)."
                valeur={codeBanqueDefaut}
                onChange={setCodeBanqueDefaut}
                onIncrement={() =>
                  setCodeBanqueDefaut((prev) =>
                    String((parseInt(prev, 10) || 0) + 1).padStart(3, '0')
                  )
                }
                onDecrement={() =>
                  setCodeBanqueDefaut((prev) =>
                    String(Math.max(1, (parseInt(prev, 10) || 1) - 1)).padStart(3, '0')
                  )
                }
              />

              {/* Section d'enregistrement à droite */}
              <div className="flex flex-col items-end gap-[0.429rem] pt-[1.714rem]">
                <Button
                  type="submit"
                  disabled={mutationParametres.isPending}
                  className="h-[2.429rem] px-[1.714rem] rounded-[0.429rem] bg-[var(--primary)] hover:bg-[var(--primary-strong)] text-[var(--primary-foreground)] text-[0.929rem] font-semibold cursor-pointer shadow-xs transition-colors"
                >
                  {mutationParametres.isPending ? 'Enregistrement…' : 'Enregistrer'}
                </Button>
                <p className="text-[0.786rem] text-[var(--text-2)] italic text-right">
                  Ces réglages s’appliquent aux prochaines opérations.
                </p>
              </div>
            </form>
          )}
        </div>
      ) : ongletActif === 'journal' ? (
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
      ) : (
        /* Onglet Sauvegarde, Restauration, Import .db & Mises à jour */
        <div className="space-y-[1.714rem]">
          {/* Ligne 1 : Exporter une sauvegarde & Restaurer la base (Point Zéro) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[1.714rem]">
            {/* Export d'une sauvegarde via explorateur de dossier */}
            <div className="rounded-[0.571rem] bg-[var(--surface)] border border-[var(--border)] shadow-xs p-[1.714rem] flex flex-col justify-between space-y-[1rem]">
              <div className="space-y-[0.571rem]">
                <div className="flex items-center gap-[0.571rem]">
                  <Download className="w-[1.143rem] h-[1.143rem] text-[var(--primary)]" />
                  <h3 className="font-semibold text-[1rem] text-[var(--text)]">
                    Exporter une sauvegarde
                  </h3>
                </div>
                <p className="text-[0.786rem] text-[var(--text-2)] leading-relaxed">
                  Sélectionnez un répertoire sur votre ordinateur pour générer instantanément un
                  fichier de sauvegarde complet (.db) de la base de données.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleExporterSauvegarde}
                disabled={chargementSauvegarde}
                className="w-full h-[2.429rem] text-[0.857rem] font-medium cursor-pointer"
              >
                {chargementSauvegarde
                  ? 'Exportation en cours…'
                  : 'Choisir un répertoire et exporter (.db)'}
              </Button>
            </div>

            {/* Restauration au point zéro */}
            <div className="rounded-[0.571rem] bg-[var(--surface)] border border-[var(--border)] shadow-xs p-[1.714rem] flex flex-col justify-between space-y-[1rem]">
              <div className="space-y-[0.571rem]">
                <div className="flex items-center gap-[0.571rem]">
                  <RotateCcw className="w-[1.143rem] h-[1.143rem] text-rose-500" />
                  <h3 className="font-semibold text-[1rem] text-[var(--text)]">
                    Restaurer la base (Point zéro)
                  </h3>
                </div>
                <p className="text-[0.786rem] text-[var(--text-2)] leading-relaxed">
                  Remet la base de données à son état initial (point zéro). Toutes les données
                  actuelles (employés, paies, historique) seront supprimées après confirmation.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setConfirmationResetTexte('');
                  setDialogueResetOuvert(true);
                }}
                className="w-full h-[2.429rem] text-[0.857rem] font-medium text-rose-600 border-rose-500/30 hover:bg-rose-500/10 cursor-pointer"
              >
                Restaurer la base
              </Button>
            </div>
          </div>

          {/* Ligne 2 : Mises à jour du logiciel & Importer un fichier .db */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[1.714rem]">
            {/* Mises à jour du logiciel */}
            <div className="rounded-[0.571rem] bg-[var(--surface)] border border-[var(--border)] shadow-xs p-[1.714rem] flex flex-col justify-between space-y-[1rem]">
              <div className="space-y-[0.571rem]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-[0.571rem]">
                    <Download className="w-[1.143rem] h-[1.143rem] text-[var(--primary)]" />
                    <h3 className="font-semibold text-[1rem] text-[var(--text)]">
                      Mises à jour du logiciel
                    </h3>
                  </div>
                  <span className="text-[0.786rem] px-2.5 py-0.5 rounded-full bg-[var(--hover)] text-[var(--text)] font-mono border border-[var(--border)]">
                    v{versionApp}
                  </span>
                </div>
                <p className="text-[0.786rem] text-[var(--text-2)] leading-relaxed">
                  Recherchez les dernières versions stables et installez-les en un clic en toute
                  sécurité.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  try {
                    toast.info('Recherche de mises à jour…');
                    const info = await api.maj.verifier();
                    if (info?.statut === 'telecharge') {
                      toast.success(
                        `Mise à jour ${info.versionDisponible || ''} prête à installer !`
                      );
                    } else if (info?.statut === 'telechargement') {
                      toast.info(
                        `Téléchargement de la mise à jour en cours (${info.progression || 0}%)…`
                      );
                    } else if (info?.statut === 'disponible') {
                      toast.info(
                        `Nouvelle version ${info.versionDisponible || ''} détectée, téléchargement lancé…`
                      );
                    } else {
                      toast.success(`L'application École RAFIKI est à jour (v${versionApp}).`);
                    }
                  } catch (err: any) {
                    toast.error(`Erreur vérification : ${err?.message || err}`);
                  }
                }}
                className="w-full h-[2.429rem] text-[0.857rem] font-medium cursor-pointer"
              >
                Rechercher une mise à jour
              </Button>
            </div>

            {/* Importer une base de données *.db */}
            <div className="rounded-[0.571rem] bg-[var(--surface)] border border-[var(--border)] shadow-xs p-[1.714rem] flex flex-col justify-between space-y-[1rem]">
              <div className="space-y-[0.571rem]">
                <div className="flex items-center gap-[0.571rem]">
                  <Upload className="w-[1.143rem] h-[1.143rem] text-[var(--primary)]" />
                  <h3 className="font-semibold text-[1rem] text-[var(--text)]">
                    Importer une base de données (.db)
                  </h3>
                </div>
                <p className="text-[0.786rem] text-[var(--text-2)] leading-relaxed">
                  Sélectionnez un fichier de base de données (*.db ou *.sqlite) pour récupérer des
                  données précises d’opérations et d’employés.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleImporterDb}
                disabled={chargementImportDb}
                className="w-full h-[2.429rem] text-[0.857rem] font-medium cursor-pointer"
              >
                {chargementImportDb ? 'Importation en cours…' : 'Importer un fichier .db'}
              </Button>
            </div>
          </div>

          {/* Ligne 3 : Fiche Journal des Logs techniques */}
          <div className="rounded-[0.571rem] bg-[var(--surface)] border border-[var(--border)] shadow-xs p-[1.714rem] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-[1rem]">
            <div className="space-y-[0.286rem]">
              <div className="flex items-center gap-[0.571rem]">
                <FileText className="w-[1.143rem] h-[1.143rem] text-[var(--primary)]" />
                <h3 className="font-semibold text-[1rem] text-[var(--text)]">
                  Fiche Journal des Logs techniques
                </h3>
              </div>
              <p className="text-[0.786rem] text-[var(--text-2)] leading-relaxed">
                Consultez et copiez les journaux d’erreurs détaillés (importation, système) pour le
                support technique. Également accessible depuis le raccourci sur votre Bureau.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => api.logs.ouvrirVisionneuse().catch((e) => toast.error(String(e)))}
              className="h-[2.429rem] px-[1.143rem] text-[0.857rem] font-medium shrink-0 cursor-pointer"
            >
              Ouvrir la fiche journal
            </Button>
          </div>
        </div>
      )}

      {/* Modale de confirmation stricte pour réinitialisation au point zéro */}
      <Dialog
        open={dialogueResetOuvert}
        onOpenChange={(open) => {
          if (!chargementReset) setDialogueResetOuvert(open);
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-[0.571rem] text-rose-500">
            <AlertTriangle className="w-[1.286rem] h-[1.286rem]" />
            <span>Restaurer la base au point zéro</span>
          </DialogTitle>
          <DialogDescription>
            Cette action est irréversible. Tous les employés, opérations de paie et journaux actuels
            seront supprimés et l’application reviendra à son état vierge d’origine.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-[0.857rem] py-[0.571rem]">
          <p className="text-[0.857rem] text-[var(--text)]">
            Pour confirmer, veuillez saisir exactement{' '}
            <strong className="font-mono text-rose-500">Supprimer toutes les données</strong>{' '}
            ci-dessous :
          </p>
          <Input
            type="text"
            value={confirmationResetTexte}
            onChange={(e) => setConfirmationResetTexte(e.target.value)}
            placeholder="Supprimer toutes les données"
            className="w-full"
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={chargementReset}
            onClick={() => setDialogueResetOuvert(false)}
          >
            Annuler
          </Button>
          <Button
            type="button"
            disabled={
              chargementReset || confirmationResetTexte.trim() !== 'Supprimer toutes les données'
            }
            onClick={handleReinitialiserPointZero}
            className="bg-rose-600 hover:bg-rose-700 text-white cursor-pointer disabled:opacity-50"
          >
            {chargementReset ? 'Réinitialisation…' : 'Confirmer la suppression'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
