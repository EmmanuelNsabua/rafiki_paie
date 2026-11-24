import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ReglagesPage from '../src/app/reglages/page';

describe('Écran Réglages (Section 6.7)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    window.api = {
      env: { estDev: true },
      pingDb: vi.fn().mockResolvedValue({ success: true, sqlite_version: '3.54.0' }),
      parametres: {
        lire: vi.fn().mockResolvedValue({
          ok: true,
          data: {
            id: 'param-1',
            jours_ouvrables_defaut: 22,
            diviseur_retenue: 3,
            unite_arrondi: 10,
            code_banque_defaut: '001',
            mis_a_jour_le: '2026-11-20T10:00:00Z',
          },
        }),
        modifier: vi.fn().mockImplementation((input) =>
          Promise.resolve({
            ok: true,
            data: {
              id: 'param-1',
              jours_ouvrables_defaut: input.jours_ouvrables_defaut ?? 22,
              diviseur_retenue: input.diviseur_retenue ?? 3,
              unite_arrondi: input.unite_arrondi ?? 10,
              code_banque_defaut: input.code_banque_defaut ?? '001',
              mis_a_jour_le: '2026-11-20T10:00:00Z',
            },
          })
        ),
      },
      journal: {
        lister: vi.fn().mockResolvedValue({
          ok: true,
          data: [
            {
              id: 'log-1',
              horodatage: '2026-11-20T10:00:00Z',
              action: 'MODIFICATION_PARAMETRES',
              entite: 'parametre',
              entite_id: 'param-1',
              detail: 'Modification des jours ouvrables par défaut (22)',
            },
          ],
        }),
      },
    } as any;
  });

  const renderPage = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ReglagesPage />
      </QueryClientProvider>
    );
  };

  it('affiche les paramètres et enregistre les modifications', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Réglages')).toBeInTheDocument();
      expect(screen.getByDisplayValue('22')).toBeInTheDocument();
      expect(screen.getByDisplayValue('30,0%')).toBeInTheDocument();
      expect(screen.getByDisplayValue('001')).toBeInTheDocument();
    });

    const champCode = screen.getByLabelText(/Code banque proposé aux nouveaux employés/i);
    fireEvent.change(champCode, { target: { value: '002' } });

    const boutonEnregistrer = screen.getByRole('button', { name: /Enregistrer/i });
    fireEvent.click(boutonEnregistrer);

    await waitFor(() => {
      expect(window.api!.parametres.modifier).toHaveBeenCalledWith(
        expect.objectContaining({
          code_banque_defaut: '002',
          jours_ouvrables_defaut: 22,
          diviseur_retenue: 3,
        })
      );
    });
  });

  it('gère la retenue aussi bien en écrivant 30,0% que 1/3', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByDisplayValue('30,0%')).toBeInTheDocument();
    });

    const champRetenue = screen.getByLabelText(/Retenue maladie et congé/i);

    // Test avec "1/3"
    fireEvent.change(champRetenue, { target: { value: '1/3' } });
    const boutonEnregistrer = screen.getByRole('button', { name: /Enregistrer/i });
    fireEvent.click(boutonEnregistrer);

    await waitFor(() => {
      expect(window.api!.parametres.modifier).toHaveBeenCalledWith(
        expect.objectContaining({
          diviseur_retenue: 3,
        })
      );
    });

    // Test avec "50%"
    fireEvent.change(champRetenue, { target: { value: '50%' } });
    fireEvent.click(boutonEnregistrer);

    await waitFor(() => {
      expect(window.api!.parametres.modifier).toHaveBeenCalledWith(
        expect.objectContaining({
          diviseur_retenue: 2,
        })
      );
    });
  });

  it('bascule vers l’onglet Journal d’activité et liste les actions', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Réglages')).toBeInTheDocument();
    });

    const ongletJournal = screen.getByRole('button', { name: /Journal d’activité/i });
    fireEvent.click(ongletJournal);

    await waitFor(() => {
      expect(screen.getByText('Dernières 100 actions')).toBeInTheDocument();
      expect(screen.getByText('MODIFICATION_PARAMETRES')).toBeInTheDocument();
      expect(
        screen.getByText('Modification des jours ouvrables par défaut (22)')
      ).toBeInTheDocument();
    });
  });
});
