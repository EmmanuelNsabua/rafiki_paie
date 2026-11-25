import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RecapitulatifEtControlePage from '../src/app/historique/page';
import type { ElectronApi } from '@rafiki/contrat';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
  }),
  usePathname: () => '/historique/',
}));

describe('Écran Récapitulatif & Contrôle', () => {
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
          ],
        }),
        obtenir: vi.fn().mockResolvedValue({
          ok: true,
          data: {
            operation: {
              id: 'op-2026-11',
              annee: 2026,
              mois: 11,
              jours_ouvrables: 22,
              statut: 'terminee',
            },
            lignes: [
              {
                id: 'ligne-1',
                operation_id: 'op-2026-11',
                employe_id: 'emp-1',
                numero: 1,
                nom: 'MUBIKAYI',
                postnom: 'NSABUA',
                prenom: 'Emmanuel',
                salaire_base: '500',
                hs: '40',
                retrait: '20',
                salaire_a_payer: '520',
                jours_maladie: 0,
                retenue_maladie: '0.00',
                jours_conge: 0,
                retenue_conge: '0.00',
                jours_absence: 0,
                retenue_absence: '0.00',
                net_global: '520',
                virement: '520',
              },
            ],
            totaux: {
              total_salaire_base: '500.00',
              total_hs: '40.00',
              total_retrait: '20.00',
              total_salaire_a_payer: '520.00',
              total_retenue_maladie: '0.00',
              total_retenue_conge: '0.00',
              total_retenue_absence: '0.00',
              total_net_global: '520.00',
              total_virement: '520.00',
              ecart_arrondi: '0.00',
              nombre_employes: 1,
            },
            synthese: {
              masse_salariale: '500.00',
              total_paye: '520.00',
              salaire_moyen: '520.00',
              nombre_employes: 1,
            },
            parametres: {
              jours_ouvrables_defaut: 22,
              diviseur_retenue: '3',
              unite_arrondi: '10',
            },
          },
        }),
      },
      exports: {
        recapitulatif: vi.fn().mockResolvedValue({
          ok: true,
          data: {
            succes: true,
            nomFichier: 'Recapitulatif-Paie-Novembre-2026.xlsx',
          },
        }),
      },
    } as unknown as ElectronApi;
  });

  it('affiche le titre Récapitulatif & Contrôle et le tableau de contrôle', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <RecapitulatifEtControlePage />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Récapitulatif & Contrôle')).toBeInTheDocument();
      expect(screen.getByText('Exporter la synthèse (Excel)')).toBeInTheDocument();
      expect(screen.getByText('Effectif actif (employés saisis)')).toBeInTheDocument();
    });
  });
});
