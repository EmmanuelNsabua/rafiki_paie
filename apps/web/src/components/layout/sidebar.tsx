'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { FileText, FileSpreadsheet, Users, Settings } from 'lucide-react';
import { StarclipLogo } from '@/components/layout/starclip-logo';

const MENU_ITEMS = [
  {
    href: '/journal-de-paie/',
    label: 'Journal de paie',
    icon: FileText,
  },
  {
    href: '/historique/',
    label: 'Récapitulatif & Contrôle',
    icon: FileSpreadsheet,
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
    if (href === '/journal-de-paie/') {
      return pathname.startsWith('/journal-de-paie') || pathname.startsWith('/operation');
    }
    return pathname.startsWith(href);
  };

  const isReglagesActive = pathname.startsWith('/reglages');

  return (
    <aside
      aria-label="Navigation principale"
      className="fixed left-0 top-[2.286rem] bottom-0 w-[16.571rem] bg-[var(--fenetre)] border-r border-[var(--trait)] z-30 flex flex-col justify-between select-none"
    >
      <div>
        {/* Marque : Tuile École RAFIKI */}
        <div className="pt-[1.143rem] px-[1rem] flex items-center gap-[0.714rem]">
          <div
            className="w-[2.286rem] h-[2.286rem] rounded-[0.429rem] overflow-hidden flex items-center justify-center shrink-0 border border-[var(--border)] shadow-xs bg-white"
            aria-hidden="true"
          >
            <StarclipLogo className="w-full h-full" />
          </div>
          <div className="min-w-0">
            <h1 className="text-[1.143rem] font-bold text-[var(--text)] leading-[1.429rem] truncate">
              École RAFIKI
            </h1>
            <p className="text-[0.857rem] font-normal text-[var(--text-2)] leading-[1.143rem] truncate">
              Gestionnaire de paie
            </p>
          </div>
        </div>

        {/* Entrées de menu */}
        <nav className="mt-14 px-[0.714rem] flex flex-col gap-[0.286rem]">
          {MENU_ITEMS.map((item) => {
            const active = isItemActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'h-[2.571rem] px-[0.857rem] rounded-[0.429rem] flex items-center gap-[0.714rem] text-[1rem] leading-[1.429rem] transition-colors',
                  active
                    ? 'bg-[var(--primary)] text-[var(--primary-foreground)] font-semibold shadow-xs'
                    : 'text-[var(--text-2)] font-normal hover:bg-[var(--hover)] hover:text-[var(--text)]'
                )}
              >
                <Icon
                  className={cn(
                    'w-[1.286rem] h-[1.286rem] shrink-0',
                    active ? 'text-[var(--primary-foreground)]' : 'text-[var(--text-2)]'
                  )}
                />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Réglages en bas */}
      <div className="p-[0.714rem] pb-[1rem]">
        <Link
          href="/reglages/"
          className={cn(
            'h-[2.571rem] px-[0.857rem] rounded-[0.429rem] flex items-center gap-[0.714rem] text-[1rem] leading-[1.429rem] transition-colors',
            isReglagesActive
              ? 'bg-[var(--primary)] text-[var(--primary-foreground)] font-semibold shadow-xs'
              : 'text-[var(--text-2)] font-medium hover:bg-[var(--hover)] hover:text-[var(--text)]'
          )}
        >
          <Settings
            className={cn(
              'w-[1.286rem] h-[1.286rem] shrink-0',
              isReglagesActive ? 'text-[var(--primary-foreground)]' : 'text-[var(--text-2)]'
            )}
          />
          <span className="truncate">Réglages</span>
        </Link>
      </div>
    </aside>
  );
}
