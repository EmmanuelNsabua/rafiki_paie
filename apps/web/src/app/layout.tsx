import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { Shell } from '@/components/layout/shell';

export const metadata: Metadata = {
  title: 'École RAFIKI - Gestionnaire de paie',
  description: "Logiciel de paie de l'École RAFIKI",
  icons: {
    icon: '/icon_starclip.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body>
        <Providers>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
