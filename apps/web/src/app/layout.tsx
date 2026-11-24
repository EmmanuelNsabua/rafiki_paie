import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { Shell } from '@/components/layout/shell';

export const metadata: Metadata = {
  title: 'Starclip - Gestionnaire de paie',
  description: "Starclip - Logiciel de paie de l'École Rafiki",
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
