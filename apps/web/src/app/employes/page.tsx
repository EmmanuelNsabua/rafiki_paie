'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Employe } from '@rafiki/contrat';
import { formaterMontant } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { DropdownMenu } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { FicheEmployeSheet } from '@/components/employes/fiche-employe-sheet';
import { Plus, MoreHorizontal, AlertTriangle, Users } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';

function EmployesContenu() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const deepLinkId = searchParams.get('id');

  const [afficherInactifs, setAfficherInactifs] = React.useState(false);
  const [ficheOuverte, setFicheOuverte] = React.useState(false);
  const [employeSelectionne, setEmployeSelectionne] = React.useState<Employe | null>(null);

  // 1. Liste des employés
  const { data: employes = [], isLoading } = useQuery({
    queryKey: ['employes-liste', afficherInactifs],
    queryFn: () => api.employes.lister({ inclureInactifs: afficherInactifs }),
  });

  // 2. Paramètres de l'école (pour le code banque par défaut)
  const { data: parametres } = useQuery({
    queryKey: ['parametres'],
    queryFn: () => api.parametres.lire(),
  });

  // Deep-link automatique si ?id=... dans l'URL
  React.useEffect(() => {
    if (deepLinkId && employes.length > 0) {
      const cible = employes.find((e) => e.id === deepLinkId);
      if (cible) {
        setEmployeSelectionne(cible);
        setFicheOuverte(true);
      }
    }
  }, [deepLinkId, employes]);

  // Mutations
  const mutationCreer = useMutation({
    mutationFn: (donnees: Parameters<typeof api.employes.creer>[0]) => api.employes.creer(donnees),
    onSuccess: (nouvelEmp) => {
      queryClient.invalidateQueries({ queryKey: ['employes-liste'] });
      queryClient.invalidateQueries({ queryKey: ['employes-actifs'] });
      toast.success(`Employé ${nouvelEmp.nom} créé avec succès`);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Erreur lors de la création de l’employé');
    },
  });

  const mutationModifier = useMutation({
    mutationFn: (donnees: Parameters<typeof api.employes.modifier>[0]) =>
      api.employes.modifier(donnees),
    onSuccess: (empModifie) => {
      queryClient.invalidateQueries({ queryKey: ['employes-liste'] });
      queryClient.invalidateQueries({ queryKey: ['employes-actifs'] });
      toast.success(`Employé ${empModifie.nom} modifié avec succès`);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Erreur lors de la modification de l’employé');
    },
  });

  const mutationDesactiver = useMutation({
    mutationFn: (id: string) => api.employes.desactiver({ id }),
    onSuccess: (emp) => {
      queryClient.invalidateQueries({ queryKey: ['employes-liste'] });
      queryClient.invalidateQueries({ queryKey: ['employes-actifs'] });
      toast.success(`Employé ${emp.nom} désactivé`);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Erreur lors de la désactivation');
    },
  });

  const handleAjouter = () => {
    setEmployeSelectionne(null);
    setFicheOuverte(true);
  };

  const handleModifier = (emp: Employe) => {
    setEmployeSelectionne(emp);
    setFicheOuverte(true);
  };

  const handleBasculerActif = async (emp: Employe) => {
    if (emp.actif === 1) {
      await mutationDesactiver.mutateAsync(emp.id);
    } else {
      await mutationModifier.mutateAsync({ id: emp.id, actif: 1 });
    }
  };

  const nbActifs = React.useMemo(() => {
    return employes.filter((e) => e.actif === 1).length;
  }, [employes]);

  if (isLoading) {
    return (
      <div className="space-y-[1.143rem]">
        <Skeleton className="h-[4.571rem] w-full rounded-[0.571rem]" />
        <Skeleton className="h-[25rem] w-full rounded-[0.571rem]" />
      </div>
    );
  }

  return (
    <div className="space-y-[1.143rem]">
      {/* 1. Carte d'en-tête */}
      <div className="flex items-center justify-between p-[1.143rem] min-h-[4.571rem] rounded-[0.571rem] bg-[var(--surface)] border border-[var(--border)] shadow-xs">
        <h1 className="text-[1.714rem] font-semibold text-[var(--text)] leading-[2.286rem] tracking-tight">
          Liste des employés
        </h1>
        <Button
          onClick={handleAjouter}
          className="h-[2.429rem] px-[1rem] rounded-[0.429rem] bg-[var(--primary)] hover:bg-[var(--primary-strong)] text-white text-[0.929rem] font-semibold flex items-center gap-[0.429rem] cursor-pointer shadow-xs"
        >
          <Plus className="w-[1.143rem] h-[1.143rem]" />
          <span>Ajouter un employé</span>
        </Button>
      </div>

      {/* 2. Carte de tableau */}
      <div className="rounded-[0.571rem] bg-[var(--surface)] border border-[var(--border)] shadow-xs overflow-hidden">
        {/* Bandeau de titre du tableau */}
        <div className="flex flex-wrap items-center justify-between gap-[0.857rem] px-[1.143rem] h-[3.143rem] border-b border-[var(--border)]">
          <h2 className="text-[1.143rem] font-semibold text-[var(--text)] tracking-tight">
            Employés
          </h2>

          <div className="flex items-center gap-[1.143rem]">
            <span className="text-[0.857rem] text-[var(--text-2)]">
              {nbActifs} employé{nbActifs > 1 ? 's' : ''} actif{nbActifs > 1 ? 's' : ''} · Montants
              en dollars ($)
            </span>

            <div className="flex items-center gap-[0.429rem]">
              <Switch
                id="switch-inactifs"
                checked={afficherInactifs}
                onCheckedChange={setAfficherInactifs}
              />
              <label
                htmlFor="switch-inactifs"
                className="text-[0.857rem] font-medium text-[var(--text)] cursor-pointer select-none"
              >
                Afficher les inactifs
              </label>
            </div>
          </div>
        </div>

        {/* Grille des employés */}
        {employes.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-[2.857rem] text-center">
            <Users className="w-[2.286rem] h-[2.286rem] text-[var(--text-2)] mb-[0.571rem] opacity-40" />
            <p className="text-[1rem] font-medium text-[var(--text)]">Aucun employé trouvé</p>
            <p className="text-[0.857rem] text-[var(--text-2)] mt-[0.286rem]">
              {afficherInactifs
                ? 'Aucun employé actif ou inactif n’est enregistré.'
                : 'Aucun employé actif. Activez « Afficher les inactifs » ou ajoutez-en un.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="h-[2.571rem] bg-[var(--table-head)] border-b border-[var(--border)] text-[0.857rem] font-medium text-[var(--text-2)]">
                  <th className="w-[3.5rem] px-[0.857rem] text-center">N°</th>
                  <th className="px-[1.143rem]">Employé</th>
                  <th className="px-[1.143rem]">Téléphone</th>
                  <th className="px-[1.143rem]">Code banque</th>
                  <th className="w-[14rem] px-[1.143rem] text-right">Salaire de base ($)</th>
                  <th className="w-[8rem] px-[1.143rem] text-center">État</th>
                  <th className="w-[5rem] px-[0.857rem] text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] text-[1rem]">
                {employes.map((emp, index) => {
                  const nomComplet = `${emp.nom} ${emp.postnom || ''} ${emp.prenom || ''}`.trim();
                  const sansTel = !emp.telephone || !emp.telephone.trim();
                  const sansBanque = !emp.code_banque || !emp.code_banque.trim();
                  const estActif = emp.actif === 1;

                  return (
                    <tr
                      key={emp.id}
                      onClick={() => handleModifier(emp)}
                      className="h-[3.143rem] hover:bg-[var(--hover)] transition-colors cursor-pointer"
                    >
                      {/* N° */}
                      <td className="px-[0.857rem] text-center text-[var(--text-2)] font-mono">
                        {String(emp.numero || index + 1).padStart(2, '0')}
                      </td>

                      {/* Employé (nom + fonction) */}
                      <td className="px-[1.143rem]">
                        <div className="font-medium text-[var(--text)] leading-tight">
                          {nomComplet}
                        </div>
                        {emp.fonction ? (
                          <div className="text-[0.786rem] text-[var(--text-2)] mt-[0.143rem]">
                            {emp.fonction}
                          </div>
                        ) : null}
                      </td>

                      {/* Téléphone */}
                      <td className="px-[1.143rem] font-mono text-[0.857rem]">
                        {sansTel ? (
                          <span className="inline-flex items-center gap-[0.286rem] text-[var(--warning-text)] text-[0.786rem] font-sans font-medium">
                            <AlertTriangle className="w-[0.857rem] h-[0.857rem]" />
                            <span>Manquant</span>
                          </span>
                        ) : (
                          <span className="text-[var(--text)]">{emp.telephone}</span>
                        )}
                      </td>

                      {/* Code banque */}
                      <td className="px-[1.143rem] font-mono text-[0.857rem]">
                        {sansBanque ? (
                          <span className="inline-flex items-center gap-[0.286rem] text-[var(--warning-text)] text-[0.786rem] font-sans font-medium">
                            <AlertTriangle className="w-[0.857rem] h-[0.857rem]" />
                            <span>Manquant</span>
                          </span>
                        ) : (
                          <span className="text-[var(--text)]">{emp.code_banque}</span>
                        )}
                      </td>

                      {/* Salaire de base */}
                      <td className="px-[1.143rem] text-right font-medium text-[var(--text)] font-mono tabular-nums">
                        {formaterMontant(emp.salaire_base, 0)}
                      </td>

                      {/* État */}
                      <td className="px-[1.143rem] text-center">
                        {estActif ? (
                          <span className="inline-flex items-center gap-[0.286rem] h-[1.571rem] px-[0.571rem] rounded-full bg-[var(--primary-tint)] text-[var(--primary-strong)] text-[0.786rem] font-semibold">
                            <span className="w-[0.429rem] h-[0.429rem] rounded-full bg-[var(--primary)]" />
                            <span>Actif</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center h-[1.571rem] px-[0.571rem] rounded-full bg-[var(--hover)] text-[var(--text-2)] text-[0.786rem] font-medium border border-[var(--border)]">
                            Inactif
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td
                        className="px-[0.857rem] text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
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
                              label: 'Modifier',
                              onClick: () => handleModifier(emp),
                            },
                            {
                              label: estActif ? 'Désactiver' : 'Réactiver',
                              destructive: estActif,
                              onClick: () => handleBasculerActif(emp),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pied de tableau */}
        <div className="flex items-center px-[1.143rem] h-[2.571rem] border-t border-[var(--border)] text-[0.857rem] text-[var(--text-2)] bg-[var(--surface)]">
          Affichage de 1 à {employes.length} employé{employes.length > 1 ? 's' : ''}
        </div>
      </div>

      {/* 3. Feuille latérale Fiche Employé */}
      <FicheEmployeSheet
        open={ficheOuverte}
        onOpenChange={setFicheOuverte}
        employe={employeSelectionne}
        codeBanqueDefaut={parametres?.code_banque_defaut}
        onEnregistrer={async (donnees) => {
          if (donnees.id) {
            await mutationModifier.mutateAsync({
              id: donnees.id,
              nom: donnees.nom,
              postnom: donnees.postnom,
              prenom: donnees.prenom,
              fonction: donnees.fonction,
              telephone: donnees.telephone,
              code_banque: donnees.code_banque,
              salaire_base: donnees.salaire_base,
              actif: donnees.actif,
            });
          } else {
            await mutationCreer.mutateAsync({
              nom: donnees.nom,
              postnom: donnees.postnom,
              prenom: donnees.prenom,
              fonction: donnees.fonction,
              telephone: donnees.telephone,
              code_banque: donnees.code_banque,
              salaire_base: donnees.salaire_base,
            });
          }
        }}
      />
    </div>
  );
}

export default function EmployesPage() {
  return (
    <React.Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-[6.875rem] w-full rounded-[12px]" />
          <Skeleton className="h-[30rem] w-full rounded-[8px]" />
        </div>
      }
    >
      <EmployesContenu />
    </React.Suspense>
  );
}
