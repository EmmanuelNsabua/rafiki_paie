'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { FileText, ClipboardCheck, Users, Settings } from 'lucide-react';

const MENU_ITEMS = [
  {
    href: '/journal-de-paie/',
    label: 'Journal de paie',
    icon: FileText,
  },
  {
    href: '/operation/',
    label: 'Opération mensuelle',
    icon: ClipboardCheck,
  },
  {
    href: '/employes/',
    label: 'Liste des employés',
    icon: Users,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  const isItemActive = (href: string) => {
    if (href === '/operation/') {
      return pathname.startsWith('/operation');
    }
    return pathname.startsWith(href);
  };

  const isReglagesActive = pathname.startsWith('/reglages');

  return (
    <aside
      aria-label="Navigation principale"
      className="fixed left-0 top-0 bottom-0 w-[20.875rem] bg-[var(--surface)] border-r border-[var(--border)] z-30 flex flex-col justify-between select-none"
    >
      <div>
        {/* Marque : Tuile verte 72x72 + École Rafiki */}
        <div className="pt-[1.875rem] px-[1rem] flex items-center gap-[1rem]">
          <div
            className="w-[4.5rem] h-[4.5rem] rounded-[0.75rem] bg-[var(--primary)] text-white flex items-center justify-center text-[2.375rem] font-bold shrink-0 shadow-sm"
            aria-hidden="true"
          >
            R
          </div>
          <div className="min-w-0">
            <h1 className="text-[2.125rem] font-bold text-[var(--text)] leading-[1.15] truncate">
              École Rafiki
            </h1>
            <p className="text-[1.25rem] font-normal text-[var(--text-2)] truncate mt-0.5">
              Gestionnaire de paie
            </p>
          </div>
        </div>

        {/* Entrées de menu */}
        <nav className="mt-[3.875rem] px-[1rem] flex flex-col gap-[0.625rem]">
          {MENU_ITEMS.map((item) => {
            const active = isItemActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'h-[3.625rem] px-[1.25rem] rounded-[0.5rem] flex items-center gap-[1rem] text-[1.375rem] transition-colors',
                  active
                    ? 'bg-[var(--primary)] text-white font-semibold shadow-xs'
                    : 'text-[var(--text-2)] font-medium hover:bg-[var(--hover)] hover:text-[var(--text)]'
                )}
              >
                <Icon className={cn('w-[1.5rem] h-[1.5rem] shrink-0', active ? 'text-white' : 'text-[var(--text-2)]')} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Réglages en bas */}
      <div className="p-[1rem] pb-[1.5rem]">
        <Link
          href="/reglages/"
          className={cn(
            'h-[3.625rem] px-[1.25rem] rounded-[0.5rem] flex items-center gap-[1rem] text-[1.375rem] transition-colors',
            isReglagesActive
              ? 'bg-[var(--primary)] text-white font-semibold shadow-xs'
              : 'text-[var(--text-2)] font-medium hover:bg-[var(--hover)] hover:text-[var(--text)]'
          )}
        >
          <Settings className={cn('w-[1.5rem] h-[1.5rem] shrink-0', isReglagesActive ? 'text-white' : 'text-[var(--text-2)]')} />
          <span className="truncate">Réglages</span>
        </Link>
      </div>
    </aside>
  );
}
