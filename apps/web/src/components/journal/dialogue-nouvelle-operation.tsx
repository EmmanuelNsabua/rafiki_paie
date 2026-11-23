'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ErreurMetierClient } from '@/lib/api';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { libelleMois } from '@/lib/format';
import { AlertTriangle, Users } from 'lucide-react';

interface DialogueNouvelleOperationProps {
  ouvert: boolean;
  onOpenChange: (ouvert: boolean) => void;
}

export function DialogueNouvelleOperation({
  ouvert,
  onOpenChange,
}: DialogueNouvelleOperationProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [annee, setAnnee] = React.useState<number>(new Date().getFullYear());
  const [mois, setMois] = React.useState<number>(new Date().getMonth() + 1);
  const [joursOuvrables, setJoursOuvrables] = React.useState<string>('22');
  const [erreur, setErreur] = React.useState<string | null>(null);
  const [idExistante, setIdExistante] = React.useState<string | null>(null);

  // Charger les paramètres de l'école (jours ouvrables par défaut)
  const { data: parametres } = useQuery({
    queryKey: ['parametres'],
    queryFn: () => api.parametres.lire(),
    enabled: ouvert,
  });

  // Charger les employés pour vérifier s'il y en a d'actifs
  const { data: employes = [], isLoading: chargementEmployes } = useQuery({
    queryKey: ['employes-actifs'],
    queryFn: () => api.employes.lister({ inclureInactifs: false }),
    enabled: ouvert,
  });

  // Charger les opérations existantes pour proposer le mois suivant
  const { data: operations = [] } = useQuery({
    queryKey: ['operations'],
    queryFn: () => api.operations.lister(),
    enabled: ouvert,
  });

  // Pré-remplissage à l'ouverture
  React.useEffect(() => {
    if (!ouvert) {
      setErreur(null);
      setIdExistante(null);
      return;
    }

    if (parametres) {
      setJoursOuvrables(parametres.jours_ouvrables_defaut.toString());
    }

    if (operations.length > 0) {
      // Trouver la plus récente
      const opPlusRecente = operations[0]; // triée par année DESC, mois DESC
      if (opPlusRecente.mois === 12) {
        setMois(1);
        setAnnee(opPlusRecente.annee + 1);
      } else {
        setMois(opPlusRecente.mois + 1);
        setAnnee(opPlusRecente.annee);
      }
    } else {
      const now = new Date();
      setAnnee(now.getFullYear());
      setMois(now.getMonth() + 1);
    }
  }, [ouvert, operations, parametres]);

  const mutationOuvrir = useMutation({
    mutationFn: () =>
      api.operations.ouvrir({
        annee,
        mois,
        jours_ouvrables: parseInt(joursOuvrables, 10) || 22,
      }),
    onSuccess: (nouvelleOp) => {
      queryClient.invalidateQueries({ queryKey: ['operations'] });
      onOpenChange(false);
      router.push(`/operation/?id=${nouvelleOp.id}`);
    },
    onError: (err: any) => {
      if (err instanceof ErreurMetierClient && err.code === 'OPERATION_DEJA_EXISTANTE') {
        const existante = operations.find((o) => o.annee === annee && o.mois === mois);
        setErreur('Cette opération existe déjà.');
        setIdExistante(existante ? existante.id : null);
      } else {
        setErreur(err?.message || 'Erreur lors de la création de l’opération.');
        setIdExistante(null);
      }
    },
  });

  const aEmployesActifs = employes.length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErreur(null);
    setIdExistante(null);
    mutationOuvrir.mutate();
  };

  return (
    <Dialog open={ouvert} onOpenChange={onOpenChange} width="max-w-[30rem]">
      <DialogHeader>
        <DialogTitle>Nouvelle opération de paie</DialogTitle>
        <DialogDescription>
          Créez la paie mensuelle en reprenant tous les employés actifs de l’école.
        </DialogDescription>
      </DialogHeader>

      {!chargementEmployes && !aEmployesActifs ? (
        <div className="py-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-[var(--warning-tint)] text-[var(--warning-text)] flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-[1.25rem] font-semibold text-[var(--text)]">
              Ajoutez d’abord vos employés
            </h3>
            <p className="text-[1.0625rem] text-[var(--text-2)] mt-1">
              Une opération de paie nécessite au moins un employé actif.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/employes/"
              onClick={() => onOpenChange(false)}
              className="inline-flex items-center justify-center h-[3rem] px-5 rounded-[6px] bg-[var(--primary)] text-white font-semibold text-[1.125rem] hover:bg-[var(--primary-strong)]"
            >
              Aller à la liste des employés
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {erreur && (
            <div className="p-4 rounded-[8px] bg-[var(--danger-tint)] border border-[var(--danger)] text-[var(--danger)] text-[1rem] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>{erreur}</span>
              </div>
              {idExistante && (
                <Link
                  href={`/operation/?id=${idExistante}`}
                  onClick={() => onOpenChange(false)}
                  className="font-semibold underline ml-3 shrink-0"
                >
                  L’ouvrir
                </Link>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="champ-mois">Mois</Label>
            <select
              id="champ-mois"
              value={mois}
              onChange={(e) => setMois(parseInt(e.target.value, 10))}
              className="flex h-[3rem] w-full rounded-[6px] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-[1.125rem] text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {libelleMois(m)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="champ-annee">Année</Label>
            <Input
              id="champ-annee"
              type="number"
              min={2000}
              max={2100}
              value={annee}
              onChange={(e) => setAnnee(parseInt(e.target.value, 10) || annee)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="champ-jours">Jours ouvrables</Label>
            <Input
              id="champ-jours"
              type="number"
              min={1}
              max={31}
              value={joursOuvrables}
              onChange={(e) => setJoursOuvrables(e.target.value)}
              required
            />
            <p className="text-[0.9375rem] text-[var(--text-2)]">
              Valeur par défaut définie dans les réglages ({parametres?.jours_ouvrables_defaut ?? 22} jours).
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={mutationOuvrir.isPending}
            >
              {mutationOuvrir.isPending ? 'Création…' : 'Créer l’opération'}
            </Button>
          </DialogFooter>
        </form>
      )}
    </Dialog>
  );
}
