'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api, estDansElectron } from '@/lib/api';
import { formaterMontant, libelleOperation, formaterDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  FileSpreadsheet,
  Download,
  Lock,
  Clock,
  ArrowRight,
  TrendingUp,
  BarChart3,
  Calendar,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Decimal from 'decimal.js';

export default function RecapitulatifEtControlePage() {
  const router = useRouter();
  const [operationSelectionneeId, setOperationSelectionneeId] = React.useState<string | null>(null);
  const [exportEnCours, setExportEnCours] = React.useState(false);

  // 1. Liste de toutes les opérations
  const { data: operations = [], isLoading: chargementOperations } = useQuery({
    queryKey: ['operations'],
    queryFn: () => api.operations.lister(),
  });

  // Sélectionner par défaut la première opération (la plus récente)
  React.useEffect(() => {
    if (operations.length > 0 && !operationSelectionneeId) {
      setOperationSelectionneeId(operations[0].id);
    }
  }, [operations, operationSelectionneeId]);

  // 2. Détail de l'opération sélectionnée
  const { data: detail, isLoading: chargementDetail } = useQuery({
    queryKey: ['operation-detail-recap', operationSelectionneeId],
    queryFn: () =>
      operationSelectionneeId ? api.operations.obtenir({ id: operationSelectionneeId }) : null,
    enabled: Boolean(operationSelectionneeId),
  });

  // Calcul des données de la feuille Récapitulatif & Contrôle
  const recapitulatif = React.useMemo(() => {
    if (!detail) return null;

    let totalSalaire = new Decimal(0);
    let totalHs = new Decimal(0);
    let totalRetrait = new Decimal(0);
    let totalNetMaladie = new Decimal(0);
    let totalNetConge = new Decimal(0);
    let totalNetAbsence = new Decimal(0);
    let totalGlobal = new Decimal(0);
    let totalVirement = new Decimal(0);

    detail.lignes.forEach((l) => {
      totalSalaire = totalSalaire.plus(new Decimal(l.salaire_base || 0));
      totalHs = totalHs.plus(new Decimal(l.hs || 0));
      totalRetrait = totalRetrait.plus(new Decimal(l.retrait || 0));
      totalNetMaladie = totalNetMaladie.plus(new Decimal(l.retenue_maladie || 0));
      totalNetConge = totalNetConge.plus(new Decimal(l.retenue_conge || 0));
      totalNetAbsence = totalNetAbsence.plus(new Decimal(l.retenue_absence || 0));
      totalGlobal = totalGlobal.plus(new Decimal(l.net_global || 0));
      totalVirement = totalVirement.plus(new Decimal(l.virement || 0));
    });

    const totalRetenues = totalNetMaladie.plus(totalNetConge).plus(totalNetAbsence);
    const ecartArrondi = totalVirement.minus(totalGlobal);

    return {
      effectif: detail.lignes.length,
      totalSalaire: totalSalaire.toNumber(),
      totalHs: totalHs.toNumber(),
      totalRetrait: totalRetrait.toNumber(),
      totalNetMaladie: totalNetMaladie.toNumber(),
      totalNetConge: totalNetConge.toNumber(),
      totalNetAbsence: totalNetAbsence.toNumber(),
      totalRetenues: totalRetenues.toNumber(),
      totalGlobal: totalGlobal.toNumber(),
      totalVirement: totalVirement.toNumber(),
      ecartArrondi: ecartArrondi.toNumber(),
    };
  }, [detail]);

  // Export de la synthèse
  const handleExporterSynthese = async () => {
    if (!operationSelectionneeId) return;
    setExportEnCours(true);
    try {
      if (!estDansElectron()) {
        toast.error('Exportation disponible uniquement dans l application desktop.');
        return;
      }
      const res = await api.exports.recapitulatif({
        operationId: operationSelectionneeId,
        format: 'xlsx',
      });
      toast.success(`Synthèse exportée : ${res.nomFichier}`);
    } catch (err: any) {
      toast.error(`Échec de l export : ${err?.message || err}`);
    } finally {
      setExportEnCours(false);
    }
  };

  const operationCourante = operations.find((o) => o.id === operationSelectionneeId);

  return (
    <div className="space-y-[1.143rem] pb-[2.857rem]">
      {/* 1. Carte d'en-tête */}
      <div className="min-h-[4.571rem] bg-[var(--surface)] rounded-[0.571rem] p-[1.143rem] flex flex-col sm:flex-row sm:items-center justify-between gap-[0.857rem] border border-[var(--border)] shadow-xs">
        <div>
          <h1 className="text-[1.714rem] font-bold text-[var(--text)] tracking-tight leading-[2.286rem] flex items-center gap-[0.571rem]">
            <FileSpreadsheet className="w-[1.714rem] h-[1.714rem] text-[var(--primary)]" />
            <span>Récapitulatif & Contrôle</span>
          </h1>
          <p className="text-[0.857rem] text-[var(--text-2)] mt-0.5">
            Tableau de bord de synthèse et contrôle de cohérence conforme au classeur d origine.
          </p>
        </div>

        {/* Bouton d'export de la synthèse */}
        <div className="flex items-center gap-[0.571rem]">
          <Button
            type="button"
            disabled={!operationSelectionneeId || exportEnCours}
            onClick={handleExporterSynthese}
            className="h-[2.429rem] px-[1rem] rounded-[0.429rem] flex items-center gap-[0.429rem] text-[0.929rem] font-semibold cursor-pointer"
          >
            <Download className="w-[1.143rem] h-[1.143rem]" />
            <span>{exportEnCours ? 'Exportation...' : 'Exporter la synthèse (Excel)'}</span>
          </Button>
        </div>
      </div>

      {/* 2. Contenu en 2 colonnes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-[1.143rem] items-start">
        {/* Colonne gauche (Récapitulatif & Contrôle + Diagramme) : 8 cols */}
        <div className="lg:col-span-8 space-y-[1.143rem]">
          {/* Tableau Récapitulatif & Contrôle */}
          <div className="bg-[var(--surface)] rounded-[0.571rem] border border-[var(--border)] shadow-xs overflow-hidden">
            <div className="px-[1.143rem] h-[3.143rem] flex items-center justify-between border-b border-[var(--border)] bg-[var(--page)]">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[var(--primary)]" />
                <h2 className="text-[1.071rem] font-semibold text-[var(--text)]">
                  {operationCourante
                    ? `Synthèse mensuelle — ${libelleOperation(operationCourante.annee, operationCourante.mois)}`
                    : 'Synthèse mensuelle'}
                </h2>
              </div>
              {operationCourante && (
                <Badge
                  variant={operationCourante.statut === 'terminee' ? 'secondary' : 'actif'}
                  className="gap-1 text-xs"
                >
                  {operationCourante.statut === 'terminee' ? (
                    <>
                      <Lock className="w-3 h-3" />
                      <span>Terminée</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-3 h-3" />
                      <span>En cours</span>
                    </>
                  )}
                </Badge>
              )}
            </div>

            {chargementDetail ? (
              <div className="p-8 text-center text-sm text-[var(--text-2)]">
                Chargement de la synthèse…
              </div>
            ) : !recapitulatif ? (
              <div className="p-8 text-center text-sm text-[var(--text-2)]">
                Sélectionnez une opération dans la liste pour afficher le contrôle.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50%]">Indicateur de contrôle</TableHead>
                    <TableHead className="text-right w-[25%]">Montant ($)</TableHead>
                    <TableHead className="w-[25%]">Observation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium text-[var(--text)]">
                      Effectif actif (employés saisis)
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold">
                      {recapitulatif.effectif}
                    </TableCell>
                    <TableCell className="text-xs text-[var(--text-2)]">
                      Lignes renseignées
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell className="font-medium text-[var(--text)]">
                      Total Salaires de Base
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      {formaterMontant(String(recapitulatif.totalSalaire), 2)}
                    </TableCell>
                    <TableCell className="text-xs text-[var(--text-2)]">
                      Somme contractuelle
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell className="font-medium text-[var(--text)]">
                      Total Heures Supplémentaires (HS)
                    </TableCell>
                    <TableCell className="text-right font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                      +{formaterMontant(String(recapitulatif.totalHs), 2)}
                    </TableCell>
                    <TableCell className="text-xs text-[var(--text-2)]">Primes & HS</TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell className="font-medium text-[var(--text)]">
                      Total Retraits / Avances
                    </TableCell>
                    <TableCell className="text-right font-mono text-rose-600 dark:text-rose-400 font-medium">
                      -{formaterMontant(String(recapitulatif.totalRetrait), 2)}
                    </TableCell>
                    <TableCell className="text-xs text-[var(--text-2)]">Avances déduites</TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell className="text-[var(--text)] pl-6 text-xs">
                      • Dont retenues Maladie
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-[var(--text-2)]">
                      -{formaterMontant(String(recapitulatif.totalNetMaladie), 2)}
                    </TableCell>
                    <TableCell className="text-xs text-[var(--text-2)]">
                      Déduction maladie
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell className="text-[var(--text)] pl-6 text-xs">
                      • Dont retenues Congés
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-[var(--text-2)]">
                      -{formaterMontant(String(recapitulatif.totalNetConge), 2)}
                    </TableCell>
                    <TableCell className="text-xs text-[var(--text-2)]">Circonstance</TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell className="text-[var(--text)] pl-6 text-xs">
                      • Dont retenues Absences
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-[var(--text-2)]">
                      -{formaterMontant(String(recapitulatif.totalNetAbsence), 2)}
                    </TableCell>
                    <TableCell className="text-xs text-[var(--text-2)]">Injustifiées</TableCell>
                  </TableRow>

                  <TableRow className="bg-[var(--hover)] font-semibold">
                    <TableCell className="text-[var(--text)]">
                      Total GLOBAL (Avant arrondi)
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formaterMontant(String(recapitulatif.totalGlobal), 2)}
                    </TableCell>
                    <TableCell className="text-xs text-[var(--text-2)]">
                      Montant exact net
                    </TableCell>
                  </TableRow>

                  <TableRow className="bg-emerald-500/15 font-bold">
                    <TableCell className="text-emerald-950 dark:text-emerald-200">
                      TOTAL VIREMENT BANQUE (Arrondi à 10 $)
                    </TableCell>
                    <TableCell className="text-right font-mono text-base text-emerald-950 dark:text-emerald-200">
                      {formaterMontant(String(recapitulatif.totalVirement), 2)}
                    </TableCell>
                    <TableCell className="text-xs text-emerald-800 dark:text-emerald-300">
                      Bordereau bancaire
                    </TableCell>
                  </TableRow>

                  <TableRow className="border-t-2 border-[var(--border)]">
                    <TableCell className="font-semibold text-[var(--text)]">
                      Écart d arrondissement global
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-sky-600 dark:text-sky-400">
                      {recapitulatif.ecartArrondi >= 0 ? '+' : ''}
                      {formaterMontant(String(recapitulatif.ecartArrondi), 2)}
                    </TableCell>
                    <TableCell className="text-xs text-[var(--text-2)]">
                      Corrigé : Virements - Globaux
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </div>

          {/* Diagramme visuel conforme */}
          {recapitulatif && (
            <div className="bg-[var(--surface)] rounded-[0.571rem] border border-[var(--border)] p-4 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[var(--primary)]" />
                  <h3 className="text-sm font-semibold text-[var(--text)]">
                    Répartition financière de l opération
                  </h3>
                </div>
                <span className="text-xs text-[var(--text-2)]">Montants arrondis en dollars</span>
              </div>

              {/* Barres comparatives */}
              <div className="space-y-3">
                {/* Barre Salaires de base */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-[var(--text)]">Salaires de base</span>
                    <span className="font-mono font-semibold">
                      {formaterMontant(String(recapitulatif.totalSalaire), 0)}
                    </span>
                  </div>
                  <div className="h-4 w-full bg-[var(--page)] rounded-full overflow-hidden border border-[var(--border)]">
                    <div
                      className="h-full bg-slate-500 rounded-full transition-all duration-500"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                {/* Barre Retenues déduites */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-rose-600 dark:text-rose-400">
                      Total retenues (Absences, maladie, congés)
                    </span>
                    <span className="font-mono font-semibold text-rose-600 dark:text-rose-400">
                      {formaterMontant(String(recapitulatif.totalRetenues), 0)}
                    </span>
                  </div>
                  <div className="h-4 w-full bg-[var(--page)] rounded-full overflow-hidden border border-[var(--border)]">
                    <div
                      className="h-full bg-rose-500 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(
                            4,
                            (recapitulatif.totalRetenues / (recapitulatif.totalSalaire || 1)) * 100
                          )
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Barre Net Global */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-[var(--text)]">
                      Net global (avant arrondi)
                    </span>
                    <span className="font-mono font-semibold">
                      {formaterMontant(String(recapitulatif.totalGlobal), 0)}
                    </span>
                  </div>
                  <div className="h-4 w-full bg-[var(--page)] rounded-full overflow-hidden border border-[var(--border)]">
                    <div
                      className="h-full bg-sky-500 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          100,
                          (recapitulatif.totalGlobal / (recapitulatif.totalSalaire || 1)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Barre Total Virement Banque */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      Virement bancaire (montant payé)
                    </span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {formaterMontant(String(recapitulatif.totalVirement), 0)}
                    </span>
                  </div>
                  <div className="h-4 w-full bg-[var(--page)] rounded-full overflow-hidden border border-[var(--border)]">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          100,
                          (recapitulatif.totalVirement / (recapitulatif.totalSalaire || 1)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Colonne droite : Liste des opérations sticky avec hauteur fixe et défilement interne (4 cols) */}
        <div className="lg:col-span-4 sticky top-4 h-[calc(100vh-9.5rem)] mb-4 bg-[var(--surface)] rounded-[0.571rem] border border-[var(--border)] shadow-xs overflow-hidden flex flex-col">
          <div className="p-3 border-b border-[var(--border)] bg-[var(--page)] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[var(--primary)]" />
              <h2 className="text-sm font-semibold text-[var(--text)]">Mois d opération</h2>
            </div>
            <span className="text-xs text-[var(--text-2)]">{operations.length} enregistrée(s)</span>
          </div>

          <div className="overflow-y-auto flex-1 divide-y divide-[var(--border)]">
            {chargementOperations ? (
              <div className="p-6 text-center text-xs text-[var(--text-2)]">
                Chargement des opérations…
              </div>
            ) : operations.length === 0 ? (
              <div className="p-6 text-center text-xs text-[var(--text-2)]">
                Aucune opération trouvée.
              </div>
            ) : (
              operations.map((op) => {
                const estSelectionnee = op.id === operationSelectionneeId;
                return (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => setOperationSelectionneeId(op.id)}
                    className={cn(
                      'w-full text-left p-3.5 flex flex-col gap-1 transition-all cursor-pointer',
                      estSelectionnee
                        ? 'bg-[var(--primary-tint)] border-l-4 border-l-[var(--primary)] text-[var(--text)] font-semibold'
                        : 'hover:bg-[var(--hover)] text-[var(--text-2)] hover:text-[var(--text)]'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[var(--text)]">
                        {libelleOperation(op.annee, op.mois)}
                      </span>
                      <Badge
                        variant={op.statut === 'terminee' ? 'secondary' : 'actif'}
                        className="text-[0.7rem] px-2 py-0"
                      >
                        {op.statut === 'terminee' ? 'Terminée' : 'En cours'}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-xs mt-1">
                      <span>{op.nombre_employes} employé(s)</span>
                      <span className="font-mono font-semibold text-[var(--text)]">
                        {formaterMontant(op.total_paye || op.total_virement, 0)}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
