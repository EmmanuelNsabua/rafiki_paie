'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formaterDate, libelleOperation } from '@/lib/format';
import { Search, User, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

function normaliserTexte(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function Topbar() {
  const router = useRouter();
  const [dateDuJour, setDateDuJour] = React.useState('');
  const [recherche, setRecherche] = React.useState('');
  const [ouvert, setOuvert] = React.useState(false);
  const [indexSelectionne, setIndexSelectionne] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const conteneurRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setDateDuJour(formaterDate(new Date()));
  }, []);

  // Raccourci Ctrl+K
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOuvert(true);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fermeture si clic extérieur
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (conteneurRef.current && !conteneurRef.current.contains(e.target as Node)) {
        setOuvert(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Requêtes pour filtrer les résultats
  const { data: employes = [] } = useQuery({
    queryKey: ['employes-recherche'],
    queryFn: () => api.employes.lister({ inclureInactifs: true }),
    staleTime: 30000,
  });

  const { data: operations = [] } = useQuery({
    queryKey: ['operations-recherche'],
    queryFn: () => api.operations.lister(),
    staleTime: 30000,
  });

  const queryNorm = normaliserTexte(recherche);

  const employesFiltres = React.useMemo(() => {
    if (!queryNorm) return [];
    return employes
      .filter((emp) => {
        const nomComplet = `${emp.nom} ${emp.postnom} ${emp.prenom}`.trim();
        return (
          normaliserTexte(nomComplet).includes(queryNorm) ||
          normaliserTexte(emp.fonction || '').includes(queryNorm) ||
          normaliserTexte(emp.telephone || '').includes(queryNorm)
        );
      })
      .slice(0, 5);
  }, [employes, queryNorm]);

  const operationsFiltrees = React.useMemo(() => {
    if (!queryNorm) return [];
    return operations
      .filter((op) => {
        const libelle = libelleOperation(op.annee, op.mois);
        return (
          normaliserTexte(libelle).includes(queryNorm) ||
          op.annee.toString().includes(queryNorm) ||
          op.mois.toString().includes(queryNorm) ||
          (op.statut === 'terminee' && 'terminee'.includes(queryNorm)) ||
          (op.statut === 'ouverte' && 'en cours'.includes(queryNorm))
        );
      })
      .slice(0, 5);
  }, [operations, queryNorm]);

  const items = React.useMemo(() => {
    const list: Array<{
      type: 'employe' | 'operation';
      id: string;
      titre: string;
      sousTitre: string;
      href: string;
    }> = [];

    employesFiltres.forEach((e) => {
      const nomComplet = `${e.nom} ${e.postnom} ${e.prenom}`.trim();
      list.push({
        type: 'employe',
        id: `emp-${e.id}`,
        titre: nomComplet,
        sousTitre: e.fonction || 'Employé',
        href: `/employes/?id=${e.id}`,
      });
    });

    operationsFiltrees.forEach((op) => {
      list.push({
        type: 'operation',
        id: `op-${op.id}`,
        titre: libelleOperation(op.annee, op.mois),
        sousTitre: op.statut === 'terminee' ? 'Terminée' : 'En cours',
        href: `/operation/?id=${op.id}`,
      });
    });

    return list;
  }, [employesFiltres, operationsFiltrees]);

  React.useEffect(() => {
    setIndexSelectionne(0);
  }, [items]);

  const handleKeyDownInput = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndexSelectionne((prev) => (items.length > 0 ? (prev + 1) % items.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndexSelectionne((prev) =>
        items.length > 0 ? (prev - 1 + items.length) % items.length : 0
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (items[indexSelectionne]) {
        router.push(items[indexSelectionne].href);
        setOuvert(false);
        setRecherche('');
        inputRef.current?.blur();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOuvert(false);
      inputRef.current?.blur();
    }
  };

  return (
    <header className="fixed left-[20.875rem] right-0 top-0 h-[5.875rem] bg-[var(--surface)] border-b border-[var(--border)] z-20 flex items-center justify-between px-[1.5rem]">
      {/* Date du jour */}
      <div className="text-[1.375rem] font-medium text-[var(--text)] select-none">
        {dateDuJour || 'Date du jour'}
      </div>

      {/* Champ de recherche globale (500 × 57 px = 31.25rem × 3.5625rem) */}
      <div className="relative w-[31.25rem]" ref={conteneurRef}>
        <div
          onClick={() => inputRef.current?.focus()}
          className="h-[3.5625rem] w-full rounded-[4px] border border-[var(--text-2)] bg-[var(--surface)] px-[1rem] flex items-center gap-[0.75rem] focus-within:ring-2 focus-within:ring-[var(--primary)] focus-within:border-transparent transition-all"
        >
          <Search className="w-[1.5rem] h-[1.5rem] text-[var(--text-2)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={recherche}
            onChange={(e) => {
              setRecherche(e.target.value);
              setOuvert(true);
            }}
            onFocus={() => setOuvert(true)}
            onKeyDown={handleKeyDownInput}
            placeholder="Rechercher…"
            aria-label="Rechercher des employés ou des opérations"
            className="w-full bg-transparent text-[1.375rem] text-[var(--text)] placeholder:text-[var(--text-2)] outline-none"
          />
          <kbd className="h-[2.25rem] px-[0.625rem] rounded-[4px] border border-[var(--border)] bg-[var(--hover)] text-[0.9375rem] font-medium text-[var(--text-2)] flex items-center justify-center select-none shrink-0">
            Ctrl K
          </kbd>
        </div>

        {/* Popover de résultats */}
        {ouvert && queryNorm.length > 0 && (
          <div className="absolute top-[calc(100%+0.5rem)] left-0 w-full rounded-[8px] bg-[var(--surface)] border border-[var(--border)] shadow-xl overflow-hidden z-50 p-2 animate-in fade-in zoom-in-95 duration-150">
            {items.length === 0 ? (
              <div className="p-4 text-center text-[1.125rem] text-[var(--text-2)]">
                Aucun résultat pour « {recherche} »
              </div>
            ) : (
              <div className="flex flex-col gap-1 max-h-[25rem] overflow-y-auto">
                {employesFiltres.length > 0 && (
                  <div className="px-3 py-1 text-[0.875rem] font-semibold text-[var(--text-2)] uppercase tracking-wider">
                    Employés
                  </div>
                )}
                {items
                  .filter((it) => it.type === 'employe')
                  .map((it) => {
                    const globalIdx = items.findIndex((x) => x.id === it.id);
                    const isSel = globalIdx === indexSelectionne;
                    return (
                      <button
                        key={it.id}
                        type="button"
                        onClick={() => {
                          router.push(it.href);
                          setOuvert(false);
                          setRecherche('');
                        }}
                        className={cn(
                          'w-full px-3 py-2.5 rounded-[6px] text-left flex items-center justify-between transition-colors cursor-pointer',
                          isSel ? 'bg-[var(--hover)]' : 'hover:bg-[var(--hover)]'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <User className="w-5 h-5 text-[var(--primary)] shrink-0" />
                          <div>
                            <div className="text-[1.1875rem] font-medium text-[var(--text)]">
                              {it.titre}
                            </div>
                            <div className="text-[0.9375rem] text-[var(--text-2)]">
                              {it.sousTitre}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}

                {operationsFiltrees.length > 0 && (
                  <div className="px-3 py-1 mt-2 text-[0.875rem] font-semibold text-[var(--text-2)] uppercase tracking-wider">
                    Opérations
                  </div>
                )}
                {items
                  .filter((it) => it.type === 'operation')
                  .map((it) => {
                    const globalIdx = items.findIndex((x) => x.id === it.id);
                    const isSel = globalIdx === indexSelectionne;
                    return (
                      <button
                        key={it.id}
                        type="button"
                        onClick={() => {
                          router.push(it.href);
                          setOuvert(false);
                          setRecherche('');
                        }}
                        className={cn(
                          'w-full px-3 py-2.5 rounded-[6px] text-left flex items-center justify-between transition-colors cursor-pointer',
                          isSel ? 'bg-[var(--hover)]' : 'hover:bg-[var(--hover)]'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Calendar className="w-5 h-5 text-[var(--primary)] shrink-0" />
                          <div>
                            <div className="text-[1.1875rem] font-medium text-[var(--text)]">
                              {it.titre}
                            </div>
                            <div className="text-[0.9375rem] text-[var(--text-2)]">
                              {it.sousTitre}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
