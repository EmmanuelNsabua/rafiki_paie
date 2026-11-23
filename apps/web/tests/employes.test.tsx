import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EmployesPage from '../src/app/employes/page';

// Mock Next.js navigation
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/employes/',
}));

const mockEmployes = [
  {
    id: 'emp-1',
    numero: 1,
    nom: 'Kabongo',
    postnom: 'Ilunga',
    prenom: 'Gloire',
    fonction: 'Enseignant',
    telephone: '+243810000001',
    code_banque: '001',
    salaire_base: '500.00',
    actif: 1,
    version: 1,
    mis_a_jour_le: '2026-11-20T10:00:00Z',
    supprime_le: null,
  },
  {
    id: 'emp-2',
    numero: 2,
    nom: 'Mukendi',
    postnom: 'Tshilombo',
    prenom: 'Alain',
    fonction: 'Comptable',
    telephone: '', // Manquant
    code_banque: '', // Manquant
    salaire_base: '600.00',
    actif: 1,
    version: 1,
    mis_a_jour_le: '2026-11-20T10:00:00Z',
    supprime_le: null,
  },
];

describe('Écran Liste des employés (Section 6.6)', () => {
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
            code_banque_defaut: '999',
            mis_a_jour_le: '2026-11-20T10:00:00Z',
          },
        }),
      },
      employes: {
        lister: vi.fn().mockResolvedValue({
          ok: true,
          data: mockEmployes,
        }),
        creer: vi.fn().mockImplementation((input) =>
          Promise.resolve({
            ok: true,
            data: {
              ...input,
              id: 'emp-new',
              numero: 3,
              actif: 1,
              version: 1,
              mis_a_jour_le: '2026-11-20T10:00:00Z',
              supprime_le: null,
            },
          })
        ),
        modifier: vi.fn().mockImplementation((input) =>
          Promise.resolve({
            ok: true,
            data: {
              ...mockEmployes[0],
              ...input,
            },
          })
        ),
        desactiver: vi.fn().mockImplementation((input) =>
          Promise.resolve({
            ok: true,
            data: {
              ...mockEmployes[0],
              actif: 0,
            },
          })
        ),
      },
    } as any;
  });

  const renderPage = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <EmployesPage />
      </QueryClientProvider>
    );
  };

  it('affiche le titre et les informations des employés avec alertes pour champs manquants', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Liste des employés')).toBeInTheDocument();
      expect(screen.getByText('Kabongo Ilunga Gloire')).toBeInTheDocument();
      expect(screen.getByText('Mukendi Tshilombo Alain')).toBeInTheDocument();
    });

    // Champs manquants affichent « Manquant »
    const manquants = screen.getAllByText('Manquant');
    expect(manquants.length).toBeGreaterThanOrEqual(2);
  });

  it('ouvre la fiche employé avec code banque pré-rempli et soumet la création', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Liste des employés')).toBeInTheDocument();
    });

    const boutonAjouter = screen.getByRole('button', { name: /Ajouter un employé/i });
    fireEvent.click(boutonAjouter);

    await waitFor(() => {
      expect(screen.getByText('Nouvel employé')).toBeInTheDocument();
    });

    // Vérifier que le code banque est pré-rempli avec code_banque_defaut ('999')
    const champCodeBanque = screen.getByLabelText(/Code banque/i) as HTMLInputElement;
    expect(champCodeBanque.value).toBe('999');

    // Remplir les champs obligatoires
    fireEvent.change(screen.getByPlaceholderText('Ex: KABONGO'), { target: { value: 'TEST' } });
    fireEvent.change(screen.getByPlaceholderText('Ex: Gloire'), { target: { value: 'Un' } });
    fireEvent.change(screen.getByPlaceholderText('Ex: 500'), { target: { value: '500' } });

    // Soumettre
    const boutonCreer = screen.getByRole('button', { name: /Créer l’employé/i });
    fireEvent.click(boutonCreer);

    await waitFor(() => {
      expect(window.api!.employes.creer).toHaveBeenCalledWith(
        expect.objectContaining({
          nom: 'TEST',
          prenom: 'Un',
          salaire_base: '500',
          code_banque: '999',
        })
      );
    });
  });
});
