import React, { useState } from 'react';
import { Download, Copy, Check, Laptop } from 'lucide-react';

interface DownloadProps {
  releaseVersion: string;
  downloadUrl: string;
  sha256: string;
  psCommand: string;
}

export default function DownloadSection({
  releaseVersion,
  downloadUrl,
  sha256,
  psCommand,
}: DownloadProps) {
  const [copiedSha, setCopiedSha] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);

  const copyToClipboard = (text: string, type: 'sha' | 'cmd') => {
    navigator.clipboard.writeText(text);
    if (type === 'sha') {
      setCopiedSha(true);
      setTimeout(() => setCopiedSha(false), 2000);
    } else {
      setCopiedCmd(true);
      setTimeout(() => setCopiedCmd(false), 2000);
    }
  };

  return (
    <section id="download" className="relative border-t border-white/[0.08] py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Installer École RAFIKI
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-neutral-400">
            Intégrer École RAFIKI dans votre flux de travail à partir d'aujourd'hui
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-4xl">
          {/* Boîte de téléchargement */}
          <div className="rounded-2xl border border-white/10 bg-[#13161e] p-6 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Laptop className="h-5 w-5 text-[#00b4d8]" />
                  <span className="text-xl font-semibold text-white">École RAFIKI</span>
                </div>
              </div>

              <a
                href={downloadUrl}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#00b4d8] px-6 py-3.5 text-sm font-semibold text-[#0c0d10] shadow-[0_0_25px_rgba(0,180,216,0.3)] transition hover:bg-[#0096c7] active:scale-95"
              >
                <Download className="h-4 w-4" />
                <span>Télécharger</span>
              </a>
            </div>
          </div>

          {/* Installation en 3 étapes */}
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-white/[0.08] bg-[#12141a]/40 p-5">
              <div className="font-mono text-xs font-medium text-[#00b4d8]">01</div>
              <h3 className="mt-2 text-sm font-semibold text-white">Télécharger le fichier</h3>
              <p className="mt-1 text-xs leading-relaxed text-neutral-400">
                Récupérez <code className="text-[#00b4d8]">Ecole-RAFIKI-Setup-0.1.1.exe</code> avec
                le bouton ci-dessus.
              </p>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-[#12141a]/40 p-5">
              <div className="font-mono text-xs font-medium text-[#00b4d8]">02</div>
              <h3 className="mt-2 text-sm font-semibold text-white">Passer SmartScreen</h3>
              <p className="mt-1 text-xs leading-relaxed text-neutral-400">
                Si Windows affiche un avertissement, cliquez sur{' '}
                <em>Informations complémentaires</em> puis sur <em>Exécuter quand même</em>.
              </p>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-[#12141a]/40 p-5">
              <div className="font-mono text-xs font-medium text-[#00b4d8]">03</div>
              <h3 className="mt-2 text-sm font-semibold text-white">Terminer l’installation</h3>
              <p className="mt-1 text-xs leading-relaxed text-neutral-400">
                Suivez l’assistant en français : le raccourci bureau et la base locale sont créés.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
