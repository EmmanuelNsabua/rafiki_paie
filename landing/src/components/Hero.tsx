import React from 'react';
import { Download, ExternalLink } from 'lucide-react';

interface HeroProps {
  downloadUrl: string;
  releaseUrl: string;
}

export default function Hero({ downloadUrl, releaseUrl }: HeroProps) {
  return (
    <section id="overview" className="relative overflow-hidden pt-12 pb-24 lg:pt-20 lg:pb-32">
      {/* Glow & Grid Background */}
      <div className="pointer-events-none absolute inset-0 -z-10 codex-grid-bg opacity-75" />

      <div className="mx-auto max-w-7xl px-2 sm:px-4 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          {/* Titre Principal */}
          <h1 className="mt-6 text-4xl font-medium tracking-tight text-white sm:text-5xl sm:leading-[1.1]">
            Gérez la paie simplement, sur place.
          </h1>

          {/* Description */}
          <p className="mt-6 text-base leading-relaxed text-neutral-400 sm:text-lg">
            Saisie rapide, calculs fiables hors ligne et export bancaire prêt en un clic.
          </p>

          {/* Actions Hero */}
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={downloadUrl}
              className="group flex w-full items-center justify-center gap-3 rounded-lg bg-[#00b4d8] px-6 py-3.5 text-sm font-semibold text-[#0c0d10] shadow-[0_0_30px_rgba(0,180,216,0.35)] transition hover:bg-[#0096c7] active:scale-95 sm:w-auto"
            >
              <Download className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
              <span>Télécharger pour Windows</span>
            </a>

            <a
              href={releaseUrl}
              target="_blank"
              rel="noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-5 py-3.5 text-sm font-medium text-neutral-300 transition hover:border-white/20 hover:bg-white/[0.08] sm:w-auto"
            >
              <span>Notes de version</span>
              <ExternalLink className="h-4 w-4 text-neutral-400" />
            </a>
          </div>
        </div>

        {/* Mockup Fenêtre Desktop Haute Résolution */}
        <div className="mt-14 sm:mt-20">
          <div className="group relative mx-auto max-w-5xl rounded-xl border border-white/10 bg-[#12141a] p-2 shadow-[0_20px_80px_rgba(0,0,0,0.8)] ring-1 ring-white/5 transition hover:border-white/20">
            {/* En-tête de fenêtre stylisée */}
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5 text-xs text-neutral-400">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
              </div>
            </div>

            {/* Capture d'écran principale */}
            <div className="relative overflow-hidden rounded-lg bg-black/40">
              <img
                src="/screenshots/hero-dashboard.png"
                alt="Interface École RAFIKI - Tableau des salaires et synthèse"
                className="w-full object-cover shadow-inner"
                loading="eager"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
