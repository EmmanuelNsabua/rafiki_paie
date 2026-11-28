import React from 'react';
import { Download, ExternalLink } from 'lucide-react';
import Features from './components/Features';
import Hero from './components/Hero';
import DownloadSection from './components/DownloadSection';

export default function App() {
  const releaseVersion = 'v0.1.6';
  const downloadUrl =
    'https://github.com/EmmanuelNsabua/rafiki_paie/releases/download/v0.1.6/Ecole-RAFIKI-Setup-0.1.6.exe';
  const releaseUrl = 'https://github.com/EmmanuelNsabua/rafiki_paie/releases/tag/v0.1.6';
  const repoUrl = 'https://github.com/EmmanuelNsabua/rafiki_paie';
  const sha256 = 'Calculé automatiquement à chaque release';
  const psCommand =
    'Get-FileHash "$HOME\\Downloads\\Ecole-RAFIKI-Setup-0.1.6.exe" -Algorithm SHA256';

  return (
    <div className="min-h-screen bg-[#0c0d10] text-[#f3f4f6] selection:bg-[#00b4d8]/30 selection:text-white">
      {/* ─── Barre de Navigation ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#0c0d10]/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <img
              src="/logo-rafiki.jpg"
              alt="Logo École RAFIKI"
              className="h-9 w-9 rounded-lg bg-white object-contain p-0.5 shadow-[0_0_20px_rgba(22,143,184,0.35)]"
            />
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold tracking-tight text-white">
                École RAFIKI
              </span>
              <span className="rounded-full border border-[#00b4d8]/30 bg-[#00b4d8]/10 px-2 py-0.5 font-mono text-[11px] font-medium text-[#00b4d8]">
                {releaseVersion}
              </span>
            </div>
          </div>

          <nav className="hidden items-center gap-8 md:flex">
            <a
              href="#overview"
              className="text-sm font-medium text-neutral-400 transition hover:text-white"
            >
              Aperçu
            </a>
            <a
              href="#features"
              className="text-sm font-medium text-neutral-400 transition hover:text-white"
            >
              Fonctionnalités
            </a>
            <a
              href="#download"
              className="text-sm font-medium text-neutral-400 transition hover:text-white"
            >
              Téléchargement
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href={repoUrl}
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-neutral-300 transition hover:border-white/20 hover:bg-white/10 sm:inline-flex"
            >
              GitHub
              <ExternalLink className="h-3 w-3 text-neutral-400" />
            </a>
            <a
              href={downloadUrl}
              className="inline-flex items-center gap-2 rounded-md bg-[#00b4d8] px-3.5 py-1.5 text-xs font-semibold text-[#0c0d10] transition hover:bg-[#0096c7] active:scale-95"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Télécharger</span>
            </a>
          </div>
        </div>
      </header>

      {/* ─── SECTION 1: HERO & ANNONCE RELEASE ──────────────────────────────── */}
      <Hero downloadUrl={downloadUrl} releaseUrl={releaseUrl} />

      {/* ─── SECTION 2: FONCTIONNALITÉS CLÉS ─────────────────────────────────── */}
      <Features />

      {/* ─── SECTION 3: TÉLÉCHARGEMENT & GUIDE ───────────────────────────────── */}
      <DownloadSection
        releaseVersion={releaseVersion}
        downloadUrl={downloadUrl}
        sha256={sha256}
        psCommand={psCommand}
      />

      {/* ─── FOOTER MINIMALISTE ──────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.08] bg-[#090a0d] py-12 text-xs text-neutral-500">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <img
              src="/logo-rafiki.jpg"
              alt="Logo École RAFIKI"
              className="h-6 w-6 rounded bg-white object-contain p-0.5"
            />
            <span>École RAFIKI (RDC) · Release {releaseVersion}</span>
          </div>

          <div className="flex items-center gap-6">
            <a
              href={repoUrl}
              target="_blank"
              rel="noreferrer"
              className="transition hover:text-neutral-300"
            >
              GitHub
            </a>
            <a
              href={releaseUrl}
              target="_blank"
              rel="noreferrer"
              className="transition hover:text-neutral-300"
            >
              Releases
            </a>
            <a
              href="https://github.com/EmmanuelNsabua/rafiki_paie/blob/main/CHANGELOG.md"
              target="_blank"
              rel="noreferrer"
              className="transition hover:text-neutral-300"
            >
              Journal des versions
            </a>
            <a
              href="https://github.com/EmmanuelNsabua/rafiki_paie/blob/main/docs/INSTALLATION-ECOLE.md"
              target="_blank"
              rel="noreferrer"
              className="transition hover:text-neutral-300"
            >
              Guide d'installation
            </a>
          </div>

          <div>© 2026 École RAFIKI. Tous droits réservés.</div>
        </div>
      </footer>
    </div>
  );
}
