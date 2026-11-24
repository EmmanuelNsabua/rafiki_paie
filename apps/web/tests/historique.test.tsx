import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HistoriqueDePaiePage from '../src/app/historique/page';
import type { ElectronApi } from '@rafiki/contrat';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
  }),
  usePathname: () => '/historique/',
}));

describe('Écran Historique de paie', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    window.api = {
      env: { estDev: true },
      pingDb: vi.fn().mockResolvedValue({ success: true, sqlite_version: '3.54.0' }),
      operations: {
        lister: vi.fn().mockResolvedValue({
          ok: true,
          data: [
            {
              id: 'op-2026-11',
              annee: 2026,
              mois: 11,
              jours_ouvrables: 22,
              statut: 'terminee',
              total_virement: '520',
              total_paye: '520',
              nombre_employes: 1,
              mis_a_jour_le: '2026-11-20T10:00:00Z',
            },
            {
              id: 'op-2024-05',
              annee: 2024,
              mois: 5,
              jours_ouvrables: 20,
              statut: 'terminee',
              total_virement: '480',
              total_paye: '480',
              nombre_employes: 1,
              mis_a_jour_le: '2024-05-30T10:00:00Z',
            },
          ],
        }),
      },
    } as unknown as ElectronApi;
  });

  it('affiche le titre et permet de filtrer toutes les années', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <HistoriqueDePaiePage />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Historique de paie')).toBeInTheDocument();
      expect(screen.getByText('Novembre 2026')).toBeInTheDocument();
      expect(screen.getByText('Mai 2024')).toBeInTheDocument();
    });

    // Filtre sur 2024
    const btn2024 = screen.getByRole('button', { name: '2024' });
    fireEvent.click(btn2024);

    await waitFor(() => {
      expect(screen.getByText('Mai 2024')).toBeInTheDocument();
      expect(screen.queryByText('Novembre 2026')).not.toBeInTheDocument();
    });
  });
});
