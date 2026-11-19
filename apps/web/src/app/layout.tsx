import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Paie Rafiki — Fondations',
  description: "Logiciel de paie de l'École Rafiki",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
