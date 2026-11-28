import React from 'react';
import { Download, ExternalLink } from 'lucide-react';
import Features from './components/Features';
import Hero from './components/Hero';
import DownloadSection from './components/DownloadSection';

export default function App() {
  const releaseVersion = 'v0.1.5';
  const downloadUrl =
    'https://github.com/EmmanuelNsabua/rafiki_paie/releases/download/v0.1.5/Ecole-RAFIKI-Setup-0.1.5.exe';
  const releaseUrl = 'https://github.com/EmmanuelNsabua/rafiki_paie/releases/tag/v0.1.5';
  const repoUrl = 'https://github.com/EmmanuelNsabua/rafiki_paie';
  const sha256 = 'Calculé automatiquement à chaque release';
  const psCommand =
    'Get-FileHash "$HOME\\Downloads\\Ecole-RAFIKI-Setup-0.1.5.exe" -Algorithm SHA256';

  return (
    <div className="min-h-screen bg-[#0c0d10] text-[#f3f4f6] selection:bg-[#00b4d8]/30 selection:text-white">
      {/* ─── Barre de Navigation ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#0c0d10]/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#00b4d8] text-[#0c0d10] shadow-[0_0_20px_rgba(0,180,216,0.4)]">
              <svg viewBox="0 0 150 150" fill="none" className="h-6 w-6">
                <path
                  d="M74.6649 81.2903L60.5557 75.4387C56.9045 73.9244 52.8866 76.6078 52.8866 80.5606C52.8866 82.7669 54.1946 84.7632 56.2173 85.6442L76.5991 94.5213C79.1861 95.6481 82.2086 94.82 83.86 92.532L90.3045 83.6034C92.5783 80.4531 91.3041 76.0053 87.707 74.5369L54.851 61.1245C53.58 60.6056 52.1694 60.5384 50.8547 60.9339L22.8754 69.352C17.9051 70.8474 17.0497 77.5209 21.4823 80.2215L51.5607 98.547C52.4303 99.0768 53.1508 99.8193 53.6542 100.704L70.7568 130.773C73.0645 134.83 78.9177 134.814 81.2035 130.744L99.6698 97.8654C100.19 96.9395 100.946 96.1682 101.862 95.6303L127.916 80.3245C132.467 77.6514 131.598 70.829 126.523 69.3813L97.6845 61.1545C95.8507 60.6314 94.3747 59.2677 93.7085 57.4809L81.2301 24.0136C79.34 18.9441 72.2339 18.769 70.0963 23.7392L58.2474 51.2903"
                  strokeWidth="11"
                  strokeLinecap="round"
                  stroke="#0c0d10"
                />
              </svg>
            </div>
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
            <div className="flex h-6 w-6 items-center justify-center rounded bg-[#00b4d8] text-[#0c0d10]">
              <span className="font-bold text-[11px]">R</span>
            </div>
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
