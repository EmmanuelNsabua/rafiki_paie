import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import JournalDePaiePage from '../src/app/journal-de-paie/page';
import type { ElectronApi } from '@rafiki/contrat';

// Mock Next.js navigation
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
  }),
  usePathname: () => '/journal-de-paie/',
}));

describe('Écran Journal de paie (Section 6.5)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    // Mock window.api
    window.api = {
      env: { estDev: true },
      pingDb: vi.fn().mockResolvedValue({ success: true, sqlite_version: '3.54.0' }),
      operations: {
        lister: vi.fn().mockResolvedValue({
          ok: true,
          data: [
            {
              id: '11111111-1111-4111-8111-111111111111',
              annee: 2026,
              mois: 11,
              jours_ouvrables: 22,
              statut: 'ouverte',
              terminee_le: null,
              version: 1,
              mis_a_jour_le: '2026-11-22T00:00:00Z',
              supprime_le: null,
              total_virement: '2580',
              total_paye: '2580',
              nombre_employes: 6,
              variation: {
                pourcentage: '-1.2',
                sens: 'baisse',
              },
            },
            {
              id: '22222222-2222-4222-8222-222222222222',
              annee: 2026,
              mois: 10,
              jours_ouvrables: 22,
              statut: 'terminee',
              terminee_le: '2026-10-31T12:00:00Z',
              version: 2,
              mis_a_jour_le: '2026-10-31T12:00:00Z',
              supprime_le: null,
              total_virement: '2660',
              total_paye: '2660',
              nombre_employes: 6,
              variation: {
                pourcentage: null,
                sens: null,
              },
            },
          ],
        }),
        ouvrir: vi.fn().mockResolvedValue({
          ok: true,
          data: {
            id: '33333333-3333-4333-8333-333333333333',
            annee: 2026,
            mois: 12,
            jours_ouvrables: 22,
            statut: 'ouverte',
            terminee_le: null,
            version: 1,
            mis_a_jour_le: '2026-12-01T00:00:00Z',
            supprime_le: null,
          },
        }),
        obtenir: vi.fn(),
        terminer: vi.fn(),
        rouvrir: vi.fn().mockResolvedValue({
          ok: true,
          data: {
            id: '22222222-2222-4222-8222-222222222222',
            annee: 2026,
            mois: 10,
            jours_ouvrables: 22,
            statut: 'ouverte',
          },
        }),
        ajouterNouveauxEmployes: vi.fn(),
        modifierJours: vi.fn(),
        exporterBordereau: vi.fn(),
      },
      employes: {
        lister: vi.fn().mockResolvedValue({
          ok: true,
          data: [
            {
              id: 'emp-1',
              numero: 1,
              nom: 'Kabongo',
              postnom: 'Ilunga',
              prenom: 'Gloire',
              fonction: 'Enseignant',
              telephone: '+243810000001',
              code_banque: '840',
              salaire_base: '500',
              actif: 1,
              version: 1,
              mis_a_jour_le: '2026-11-22T00:00:00Z',
              supprime_le: null,
            },
          ],
        }),
        creer: vi.fn(),
        modifier: vi.fn(),
        desactiver: vi.fn(),
      },
      lignes: {
        modifier: vi.fn(),
      },
      parametres: {
        lire: vi.fn().mockResolvedValue({
          ok: true,
          data: {
            id: 'param-1',
            devise: 'USD',
            jours_ouvrables_defaut: 22,
            diviseur_retenue: 3,
            unite_arrondi: 10,
            code_banque_defaut: '840',
            version: 1,
            mis_a_jour_le: '2026-11-22T00:00:00Z',
          },
        }),
        modifier: vi.fn(),
      },
      journal: {
        lister: vi.fn().mockResolvedValue({ ok: true, data: [] }),
      },
    } as unknown as ElectronApi;
  });

  it('affiche le titre Journal de paie et les opérations listées', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <JournalDePaiePage />
      </QueryClientProvider>
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Journal de paie' })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Novembre 2026')).toBeInTheDocument();
      expect(screen.getByText('Octobre 2026')).toBeInTheDocument();
    });

    // Total payé formaté avec espace insécable et $
    expect(screen.getByText(/2\s*580\s*\$/)).toBeInTheDocument();
    expect(screen.getByText(/2\s*660\s*\$/)).toBeInTheDocument();

    // Pastilles d'état
    expect(screen.getByText('En cours')).toBeInTheDocument();
    expect(screen.getByText('Terminée')).toBeInTheDocument();
  });

  it('ouvre le dialogue de création et soumet une nouvelle opération', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <JournalDePaiePage />
      </QueryClientProvider>
    );

    const btnNouveau = screen.getByRole('button', { name: /Nouvelle opération/i });
    fireEvent.click(btnNouveau);

    expect(screen.getByRole('heading', { name: 'Nouvelle opération de paie' })).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: 'Créer l’opération' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(window.api?.operations.ouvrir).toHaveBeenCalled();
      expect(pushMock).toHaveBeenCalledWith('/operation/?id=33333333-3333-4333-8333-333333333333');
    });
  });

  it('affiche un avertissement dans le dialogue si aucun employé actif n existe', async () => {
    (window.api?.employes.lister as any).mockResolvedValueOnce({
      ok: true,
      data: [],
    });

    render(
      <QueryClientProvider client={queryClient}>
        <JournalDePaiePage />
      </QueryClientProvider>
    );

    const btnNouveau = screen.getByRole('button', { name: /Nouvelle opération/i });
    fireEvent.click(btnNouveau);

    await waitFor(() => {
      expect(screen.getByText('Ajoutez d’abord vos employés')).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: 'Aller à la liste des employés' })
      ).toBeInTheDocument();
    });
  });
});
