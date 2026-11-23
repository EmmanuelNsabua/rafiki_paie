import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { DetailOperationComplet, LignePaieCalculee, ResumeOperationLister } from '@rafiki/contrat';

// Mock Next.js navigation
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/operation/',
}));

import { CartesSynthese } from '../src/components/operation/cartes-synthese';
import { TableauSalaires } from '../src/components/operation/tableau-salaires';
import { AbsencesSheet } from '../src/components/operation/absences-sheet';
import { EnTeteOperation } from '../src/components/operation/en-tete-operation';

const fakeLigne: LignePaieCalculee = {
  id: 'ligne-uuid-1',
  operation_id: 'op-uuid-1',
  employe_id: 'emp-uuid-1',
  numero: 1,
  nom: 'Kabongo',
  postnom: 'Ilunga',
  prenom: 'Gloire',
  fonction: 'Enseignant',
  telephone: '+243810000001',
  code_banque: '001',
  salaire_base: '500.00',
  hs: '40',
  retrait: '20',
  jours_ouvrables: 22,
  jours_maladie: '2',
  jours_conge: '1',
  jours_absence: '1',
  salaire_a_payer: '520.00',
  jours_prestes: '18',
  retenue_maladie: '15.15',
  retenue_conge: '7.58',
  retenue_absence: '22.73',
  total_retenues: '45.45',
  net_global: '474.55',
  virement: '470.00',
  avertissement_net_negatif: false,
  erreur: null,
  version: 1,
  mis_a_jour_le: '2026-11-20T10:00:00Z',
  supprime_le: null,
};

const fakeLigneEnErreur: LignePaieCalculee = {
  ...fakeLigne,
  id: 'ligne-uuid-err',
  erreur: 'Le total des absences dépasse le nombre de jours ouvrables.',
};

const fakeSynthese: DetailOperationComplet['synthese'] = {
  masse_salariale: '2660.00',
  total_paye: '2580.00',
  total_net_exact: '2575.15',
  ecart_arrondi: '4.85',
  salaire_moyen: '443.33',
  nombre_employes: 6,
  variations: {
    masse_salariale: { pourcentage: '2.5', sens: 'hausse' },
    total_paye: { pourcentage: '-3.2', sens: 'baisse' },
    salaire_moyen: { pourcentage: '0.0', sens: 'stable' },
    nombre_employes: { pourcentage: null, sens: null },
  },
};

const fakeTotaux: DetailOperationComplet['totaux'] = {
  total_virement: '2580.00',
  total_net_global: '2575.15',
  ecart_arrondi: '4.85',
  nombre_employes: 6,
  nombre_lignes_erreur: 0,
  nombre_sans_telephone: 0,
  nombre_sans_code_banque: 0,
  nombre_telephones_en_double: 0,
};

const fakeOperation: ResumeOperationLister = {
  id: 'op-uuid-1',
  annee: 2026,
  mois: 11,
  jours_ouvrables: 22,
  statut: 'ouverte',
  terminee_le: null,
  version: 1,
  mis_a_jour_le: '2026-11-01T00:00:00Z',
  supprime_le: null,
  total_virement: '2580.00',
  total_paye: '2580.00',
  nombre_employes: 6,
  variation: { pourcentage: '-3.2', sens: 'baisse' },
};

describe('Écran Opération mensuelle — Tests des composants de saisie', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  const renderWithQuery = (ui: React.ReactElement) => {
    return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
  };

  describe('1. Pastilles de variation (hausse, baisse, stable, sans comparaison)', () => {
    it('affiche les 4 états de variation conformément à la maquette', () => {
      renderWithQuery(<CartesSynthese synthese={fakeSynthese} />);

      // Hausse : +2,5 %
      expect(screen.getByText(/\+2,5\s*%/)).toBeInTheDocument();

      // Baisse : −3,2 %
      expect(screen.getByText(/\u22123,2\s*%/)).toBeInTheDocument();

      // Stable : 0,0 %
      expect(screen.getByText(/0,0\s*%/)).toBeInTheDocument();

      // Aucun mois de comparaison
      expect(screen.getByText('Aucun mois de comparaison')).toBeInTheDocument();
    });
  });

  describe('2. Carte d’en-tête et blocage de « Terminer la paie »', () => {
    it('bloque le bouton « Terminer la paie » si des lignes sont en erreur', () => {
      const totauxAvecErreur = {
        ...fakeTotaux,
        nombre_lignes_erreur: 2,
      };

      renderWithQuery(
        <EnTeteOperation
          operation={fakeOperation}
          toutesOperations={[fakeOperation]}
          totaux={totauxAvecErreur}
          synthese={fakeSynthese}
          onModifierJours={vi.fn()}
          onTerminer={vi.fn()}
          onRouvrir={vi.fn()}
        />
      );

      const boutonTerminer = screen.getByRole('button', { name: /Terminer la paie/i });
      expect(boutonTerminer).toBeDisabled();
    });

    it('active le bouton « Terminer la paie » lorsqu’il n’y a aucune erreur', () => {
      renderWithQuery(
        <EnTeteOperation
          operation={fakeOperation}
          toutesOperations={[fakeOperation]}
          totaux={fakeTotaux}
          synthese={fakeSynthese}
          onModifierJours={vi.fn()}
          onTerminer={vi.fn()}
          onRouvrir={vi.fn()}
        />
      );

      const boutonTerminer = screen.getByRole('button', { name: /Terminer la paie/i });
      expect(boutonTerminer).not.toBeDisabled();
    });

    it('affiche « Rouvrir la paie » si l’opération est terminée', () => {
      const opTerminee: ResumeOperationLister = {
        ...fakeOperation,
        statut: 'terminee',
      };

      renderWithQuery(
        <EnTeteOperation
          operation={opTerminee}
          toutesOperations={[opTerminee]}
          totaux={fakeTotaux}
          synthese={fakeSynthese}
          onModifierJours={vi.fn()}
          onTerminer={vi.fn()}
          onRouvrir={vi.fn()}
        />
      );

      expect(screen.getByRole('button', { name: /Rouvrir la paie/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Terminer la paie/i })).not.toBeInTheDocument();
    });
  });

  describe('3. Tableau des salaires — Saisie, normalisation, anti-rebond et conservation du focus', () => {
    it('normalise la saisie décimale et déclenche la modification après anti-rebond', async () => {
      const onModifierLigne = vi.fn().mockResolvedValue({
        ...fakeLigne,
        hs: '45.5',
      });

      renderWithQuery(
        <TableauSalaires
          lignes={[fakeLigne]}
          estTerminee={false}
          onModifierLigne={onModifierLigne}
          onOuvrirAbsences={vi.fn()}
        />
      );

      // Clic sur la cellule HS pour l'activer
      const celluleHs = screen.getByText(/40\s*\$/);
      fireEvent.click(celluleHs);

      // Le champ input devient actif
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();

      // Saisie avec virgule et espaces : "  45,5 "
      fireEvent.change(input, { target: { value: '  45,5 ' } });

      // Immédiatement : pas encore d'appel (anti-rebond 300ms)
      expect(onModifierLigne).not.toHaveBeenCalled();

      // Avancement du temps au-delà de 300ms avec résolution des microtâches
      await act(async () => {
        vi.advanceTimersByTime(350);
        await Promise.resolve();
      });

      // L'appel doit être déclenché avec la valeur normalisée "45.5"
      expect(onModifierLigne).toHaveBeenCalledWith('ligne-uuid-1', { hs: '45.5' });
    });

    it('sérialise les requêtes pour une même ligne', async () => {
      let resolvePremiere: (val: any) => void = () => {};
      const promessePremiere = new Promise((resolve) => {
        resolvePremiere = resolve;
      });

      const onModifierLigne = vi
        .fn()
        .mockImplementationOnce(() => promessePremiere)
        .mockResolvedValueOnce({
          ...fakeLigne,
          hs: '60',
        });

      renderWithQuery(
        <TableauSalaires
          lignes={[fakeLigne]}
          estTerminee={false}
          onModifierLigne={onModifierLigne}
          onOuvrirAbsences={vi.fn()}
        />
      );

      // Clic pour éditer HS
      const celluleHs = screen.getByText(/40\s*\$/);
      fireEvent.click(celluleHs);
      const input = screen.getByRole('textbox');

      // Première frappe
      fireEvent.change(input, { target: { value: '50' } });
      await act(async () => {
        vi.advanceTimersByTime(350);
        await Promise.resolve();
      });
      expect(onModifierLigne).toHaveBeenCalledTimes(1);

      // Deuxième frappe pendant que la première est en vol
      fireEvent.change(input, { target: { value: '60' } });
      await act(async () => {
        vi.advanceTimersByTime(350);
        await Promise.resolve();
      });

      // La 2ème requête attend la fin de la 1ère
      await act(async () => {
        resolvePremiere({ ...fakeLigne, hs: '50' });
        await Promise.resolve();
      });

      expect(onModifierLigne).toHaveBeenCalledTimes(2);
    });

    it('annule la saisie avec Échap et restaure la valeur initiale', () => {
      const onModifierLigne = vi.fn();

      renderWithQuery(
        <TableauSalaires
          lignes={[fakeLigne]}
          estTerminee={false}
          onModifierLigne={onModifierLigne}
          onOuvrirAbsences={vi.fn()}
        />
      );

      const celluleHs = screen.getByText(/40\s*\$/);
      fireEvent.click(celluleHs);
      const input = screen.getByRole('textbox');

      fireEvent.change(input, { target: { value: '999' } });
      fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' });

      // L'appel ne doit pas être envoyé avec 999
      act(() => {
        vi.advanceTimersByTime(350);
      });
      expect(onModifierLigne).not.toHaveBeenCalled();
    });

    it('désactive la saisie lorsque l’opération est terminée', () => {
      renderWithQuery(
        <TableauSalaires
          lignes={[fakeLigne]}
          estTerminee={true}
          onModifierLigne={vi.fn()}
          onOuvrirAbsences={vi.fn()}
        />
      );

      // Au clic, aucun input ne doit s'ouvrir
      const celluleHs = screen.getByText(/40\s*\$/);
      fireEvent.click(celluleHs);
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('affiche l’erreur sous la ligne si le domaine retourne une erreur', () => {
      renderWithQuery(
        <TableauSalaires
          lignes={[fakeLigneEnErreur]}
          estTerminee={false}
          onModifierLigne={vi.fn()}
          onOuvrirAbsences={vi.fn()}
        />
      );

      expect(
        screen.getByText('Le total des absences dépasse le nombre de jours ouvrables.')
      ).toBeInTheDocument();
    });
  });

  describe('4. Panneau Absences', () => {
    it('affiche les retenues calculées par le domaine et le texte d’aide dynamique', () => {
      renderWithQuery(
        <AbsencesSheet
          open={true}
          onOpenChange={vi.fn()}
          ligne={fakeLigne}
          diviseurRetenue={3}
          estTerminee={false}
          onModifierAbsences={vi.fn()}
        />
      );

      expect(screen.getByText('Absences — Kabongo Ilunga Gloire')).toBeInTheDocument();

      // Retenues calculées par le domaine
      expect(screen.getByText(/15,15\s*\$/)).toBeInTheDocument();
      expect(screen.getByText(/7,58\s*\$/)).toBeInTheDocument();
      expect(screen.getByText(/22,73\s*\$/)).toBeInTheDocument();
      expect(screen.getByText(/45,45\s*\$/)).toBeInTheDocument();

      // Texte d'aide avec 1/3
      expect(
        screen.getByText(
          'Maladie et congé : 1/3 du salaire journalier par jour. Absence non justifiée : le salaire journalier complet.'
        )
      ).toBeInTheDocument();
    });

    it('déclenche la modification des absences après saisie et debounce', async () => {
      const onModifierAbsences = vi.fn().mockResolvedValue(undefined);

      renderWithQuery(
        <AbsencesSheet
          open={true}
          onOpenChange={vi.fn()}
          ligne={fakeLigne}
          diviseurRetenue={3}
          estTerminee={false}
          onModifierAbsences={onModifierAbsences}
        />
      );

      const inputMaladie = screen.getByLabelText(/Maladie/i);
      fireEvent.change(inputMaladie, { target: { value: '4' } });

      await act(async () => {
        vi.advanceTimersByTime(350);
        await Promise.resolve();
      });

      expect(onModifierAbsences).toHaveBeenCalledWith('ligne-uuid-1', {
        jours_maladie: '4',
        jours_conge: '1',
        jours_absence: '1',
      });
    });

    it('désactive les champs si l’opération est terminée', () => {
      renderWithQuery(
        <AbsencesSheet
          open={true}
          onOpenChange={vi.fn()}
          ligne={fakeLigne}
          diviseurRetenue={3}
          estTerminee={true}
          onModifierAbsences={vi.fn()}
        />
      );

      expect(screen.getByLabelText(/Maladie/i)).toBeDisabled();
      expect(screen.getByLabelText(/Congé/i)).toBeDisabled();
      expect(screen.getByLabelText(/Absence non justifiée/i)).toBeDisabled();
    });
  });
});
