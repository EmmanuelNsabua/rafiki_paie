'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { DetailOperationComplet, LignePaieCalculee } from '@rafiki/contrat';
import { EnTeteOperation } from '@/components/operation/en-tete-operation';
import { BandeauAvertissements } from '@/components/operation/bandeau-avertissements';
import { CartesSynthese } from '@/components/operation/cartes-synthese';
import { TableauSalaires } from '@/components/operation/tableau-salaires';
import { AbsencesSheet } from '@/components/operation/absences-sheet';
import { DialogueNouvelleOperation } from '@/components/journal/dialogue-nouvelle-operation';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarPlus, FileSpreadsheet } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

function OperationMensuelleContenu() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const paramId = searchParams.get('id');

  // État du panneau latéral des absences
  const [ligneAbsenceId, setLigneAbsenceId] = React.useState<string | null>(null);
  const [dialogueNouvelleOuvert, setDialogueNouvelleOuvert] = React.useState(false);

  // 1. Liste des opérations
  const {
    data: listeOperations = [],
    isLoading: chargementListe,
    isError: erreurListe,
  } = useQuery({
    queryKey: ['operations-liste'],
    queryFn: () => api.operations.lister(),
  });

  // Détermination de l'opération cible selon la section 4 :
  // param id > opération ouverte > opération la plus récente
  const operationCibleId = React.useMemo(() => {
    if (paramId) return paramId;
    if (listeOperations.length === 0) return null;
    const opOuverte = listeOperations.find((op) => op.statut === 'ouverte');
    return opOuverte ? opOuverte.id : listeOperations[0].id;
  }, [paramId, listeOperations]);

  // 2. Détail complet de l'opération cible
  const {
    data: detail,
    isLoading: chargementDetail,
    isError: erreurDetail,
  } = useQuery({
    queryKey: ['operation', operationCibleId],
    queryFn: () => (operationCibleId ? api.operations.obtenir({ id: operationCibleId }) : null),
    enabled: Boolean(operationCibleId),
  });

  // 3. Liste des employés actifs pour détecter les nouveaux non inclus
  const { data: employesActifs = [] } = useQuery({
    queryKey: ['employes-actifs'],
    queryFn: () => api.employes.lister({ inclureInactifs: false }),
  });

  const nbEmployesNonInclus = React.useMemo(() => {
    if (!detail) return 0;
    const idsDansLignes = new Set(detail.lignes.map((l) => l.employe_id));
    return employesActifs.filter((emp) => !idsDansLignes.has(emp.id)).length;
  }, [detail, employesActifs]);

  // Mutations
  const mutationModifierLigne = useMutation({
    mutationFn: async ({
      ligneId,
      variables,
    }: {
      ligneId: string;
      variables: Parameters<typeof api.lignes.modifier>[0];
    }) => {
      return api.lignes.modifier(variables);
    },
    onSuccess: (res, vars) => {
      if (!operationCibleId) return;
      queryClient.setQueryData<DetailOperationComplet>(
        ['operation', operationCibleId],
        (ancien) => {
          if (!ancien) return ancien;
          return {
            ...ancien,
            lignes: ancien.lignes.map((l) => (l.id === res.ligne.id ? res.ligne : l)),
            totaux: res.totaux,
            synthese: res.synthese,
          };
        }
      );
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erreur lors de la modification de la ligne');
    },
  });

  const mutationModifierJours = useMutation({
    mutationFn: async (jours: number) => {
      if (!operationCibleId) throw new Error('Aucune opération cible');
      return api.operations.modifierJours({
        operation_id: operationCibleId,
        jours_ouvrables: jours,
      });
    },
    onSuccess: (res) => {
      if (!operationCibleId) return;
      queryClient.setQueryData(['operation', operationCibleId], res);
      queryClient.invalidateQueries({ queryKey: ['operations-liste'] });
      toast.success('Jours ouvrables modifiés avec succès');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erreur lors de la modification des jours ouvrables');
    },
  });

  const mutationAjouterNouveauxEmployes = useMutation({
    mutationFn: async () => {
      if (!operationCibleId) throw new Error('Aucune opération cible');
      return api.operations.ajouterNouveauxEmployes({ id: operationCibleId });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['operation', operationCibleId] });
      queryClient.invalidateQueries({ queryKey: ['operations-liste'] });
      toast.success(
        `${res.ajoutes} employé${res.ajoutes > 1 ? 's' : ''} ajouté${res.ajoutes > 1 ? 's' : ''} à la paie`
      );
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erreur lors de l’ajout des nouveaux employés');
    },
  });

  const mutationTerminer = useMutation({
    mutationFn: async () => {
      if (!operationCibleId) throw new Error('Aucune opération cible');
      return api.operations.terminer({ id: operationCibleId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operation', operationCibleId] });
      queryClient.invalidateQueries({ queryKey: ['operations-liste'] });
      toast.success('Opération de paie terminée avec succès');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erreur lors de la terminaison de la paie');
    },
  });

  const mutationRouvrir = useMutation({
    mutationFn: async () => {
      if (!operationCibleId) throw new Error('Aucune opération cible');
      return api.operations.rouvrir({ id: operationCibleId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operation', operationCibleId] });
      queryClient.invalidateQueries({ queryKey: ['operations-liste'] });
      toast.success('Opération de paie rouverte avec succès');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erreur lors de la réouverture de la paie');
    },
  });

  // États de chargement et d'erreur
  if (chargementListe || (operationCibleId && chargementDetail)) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-[6.875rem] w-full rounded-[12px]" />
        <Skeleton className="h-[11.875rem] w-full rounded-[12px]" />
        <Skeleton className="h-[25rem] w-full rounded-[8px]" />
      </div>
    );
  }

  // État vide (aucune opération dans la base)
  if (listeOperations.length === 0 || !detail) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 rounded-[12px] bg-[var(--surface)] border border-[var(--border)] shadow-xs">
        <div className="w-20 h-20 rounded-full bg-[var(--primary-tint)] flex items-center justify-center text-[var(--primary)] mb-6">
          <CalendarPlus className="w-10 h-10" />
        </div>
        <h2 className="text-[2rem] font-bold text-[var(--text)] mb-2">
          Aucune opération pour le moment
        </h2>
        <p className="text-[1.25rem] text-[var(--text-2)] mb-8 max-w-md">
          Créez celle du mois pour commencer.
        </p>
        <Button
          onClick={() => setDialogueNouvelleOuvert(true)}
          className="h-12 px-6 rounded-[8px] bg-[var(--primary)] hover:bg-[var(--primary-strong)] text-white text-[1.125rem] font-semibold flex items-center gap-2 cursor-pointer"
        >
          <FileSpreadsheet className="w-5 h-5" />
          <span>Nouvelle opération</span>
        </Button>

        <DialogueNouvelleOperation
          ouvert={dialogueNouvelleOuvert}
          onOpenChange={setDialogueNouvelleOuvert}
        />
      </div>
    );
  }

  const estTerminee = detail.operation.statut === 'terminee';
  const ligneSelectionneePourAbsences =
    detail.lignes.find((l) => l.id === ligneAbsenceId) || null;

  return (
    <div className="space-y-6">
      {/* 1. Carte d'en-tête */}
      <EnTeteOperation
        operation={detail.operation}
        toutesOperations={listeOperations}
        totaux={detail.totaux}
        synthese={detail.synthese}
        joursOuvrablesDefaut={detail.parametres.jours_ouvrables_defaut}
        onModifierJours={async (jours) => {
          await mutationModifierJours.mutateAsync(jours);
        }}
        onTerminer={async () => {
          await mutationTerminer.mutateAsync();
        }}
        onRouvrir={async () => {
          await mutationRouvrir.mutateAsync();
        }}
      />

      {/* 2. Bandeau d'avertissement */}
      <BandeauAvertissements totaux={detail.totaux} />

      {/* 3. Panneau des cartes de synthèse */}
      <CartesSynthese synthese={detail.synthese} />

      {/* 4. Carte du tableau des salaires */}
      <TableauSalaires
        lignes={detail.lignes}
        estTerminee={estTerminee}
        nbEmployesNonInclus={nbEmployesNonInclus}
        onAjouterNouveauxEmployes={async () => {
          await mutationAjouterNouveauxEmployes.mutateAsync();
        }}
        onModifierLigne={async (ligneId, variables) => {
          const res = await mutationModifierLigne.mutateAsync({
            ligneId,
            variables: {
              ligne_id: ligneId,
              ...variables,
            },
          });
          return res.ligne;
        }}
        onOuvrirAbsences={(ligne) => {
          setLigneAbsenceId(ligne.id);
        }}
      />

      {/* 5. Panneau latéral des absences */}
      <AbsencesSheet
        open={Boolean(ligneAbsenceId)}
        onOpenChange={(ouvert) => {
          if (!ouvert) setLigneAbsenceId(null);
        }}
        ligne={ligneSelectionneePourAbsences}
        diviseurRetenue={detail.parametres.diviseur_retenue}
        estTerminee={estTerminee}
        onModifierAbsences={async (ligneId, vals) => {
          await mutationModifierLigne.mutateAsync({
            ligneId,
            variables: {
              ligne_id: ligneId,
              ...vals,
            },
          });
        }}
      />
    </div>
  );
}

export default function OperationMensuellePage() {
  return (
    <React.Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-[6.875rem] w-full rounded-[12px]" />
          <Skeleton className="h-[11.875rem] w-full rounded-[12px]" />
          <Skeleton className="h-[25rem] w-full rounded-[8px]" />
        </div>
      }
    >
      <OperationMensuelleContenu />
    </React.Suspense>
  );
}
