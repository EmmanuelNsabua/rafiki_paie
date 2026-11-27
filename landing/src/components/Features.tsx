import React, { useEffect, useRef, useState } from 'react';

interface FeatureShowcaseItem {
  id: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
}

const FEATURES: FeatureShowcaseItem[] = [
  {
    id: 'calculs',
    title: 'Calculs alignés sur vos règles',
    description:
      'Les primes, retenues et arrondis suivent la logique de l’École Rafiki sans écart de centimes. Vous retrouvez les mêmes montants que sur votre classeur, sans refaire les formules à la main.',
    image: '/screenshots/feature-calculs.png',
    imageAlt: 'Aperçu du calcul de paie et des arrondis dans École RAFIKI',
  },
  {
    id: 'sauvegardes',
    title: 'Sauvegardes avant chaque changement',
    description:
      'Chaque clôture ou modification importante enregistre une copie locale. Si un montant a été saisi de travers ou qu’il faut vérifier un mois précédent, vous revenez en arrière sans stress.',
    image: '/screenshots/feature-sauvegardes.png',
    imageAlt: 'Historique et sauvegardes automatiques dans École RAFIKI',
  },
  {
    id: 'exports',
    title: 'Bordereau bancaire et bulletins prêts',
    description:
      'Une fois la paie vérifiée, générez le fichier Excel pour la banque avec des totaux cohérents ainsi que les bulletins de paie prêts pour l’impression, sans copier-coller d’un onglet à l’autre.',
    image: '/screenshots/feature-exports.png',
    imageAlt: 'Export du bordereau bancaire et des bulletins de paie',
  },
];

export default function FeaturesScrollSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute('data-index'));
            if (!Number.isNaN(idx)) {
              setActiveIndex(idx);
            }
          }
        });
      },
      {
        rootMargin: '-40% 0px -40% 0px',
        threshold: 0,
      }
    );

    stepRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const currentFeature = FEATURES[activeIndex] ?? FEATURES[0];

  return (
    <section
      id="features"
      className="border-t border-white/[0.08] bg-[#0c0d10] py-20 text-[#f3f4f6] lg:py-28"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Titre centré style Codex */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mt-3 text-3xl font-medium tracking-tight text-white sm:text-4xl">
            La façon la plus efficace de travailler,{' '}
            <span className="text-neutral-400">avec des erreurs en moins.</span>
          </h2>
        </div>

        {/* Version Desktop : captures qui défilent à gauche, bloc texte sticky qui change à droite */}
        <div className="mt-16 hidden lg:grid lg:grid-cols-12 lg:gap-12 lg:items-start">
          <div className="space-y-12 pb-16 lg:col-span-7">
            {FEATURES.map((item, idx) => (
              <div
                key={item.id}
                ref={(el) => {
                  stepRefs.current[idx] = el;
                }}
                data-index={idx}
                className="scroll-mt-32"
              >
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1b2236] via-[#131722] to-[#0f1117] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.65)]">
                  <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0c0d10]">
                    <img
                      src={item.image}
                      alt={item.imageAlt}
                      className="aspect-[16/10] w-full object-cover"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="sticky top-48 pb-24 lg:col-span-5">
            <div className="min-h-[220px] py-4">
              <h3 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                {currentFeature.title}
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-neutral-400 sm:text-base">
                {currentFeature.description}
              </p>

              <div className="mt-6 flex items-center gap-2">
                {FEATURES.map((item, idx) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      stepRefs.current[idx]?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                      });
                    }}
                    aria-label={item.title}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === activeIndex ? 'w-7 bg-[#00b4d8]' : 'w-2 bg-white/15 hover:bg-white/30'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Version Mobile / Tablette : chaque capture suivie de son texte */}
        <div className="mt-12 space-y-14 lg:hidden">
          {FEATURES.map((item) => (
            <div key={item.id} className="space-y-5">
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1b2236] via-[#131722] to-[#0f1117] p-3">
                <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0c0d10]">
                  <img
                    src={item.image}
                    alt={item.imageAlt}
                    className="aspect-[16/10] w-full object-cover"
                  />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold tracking-tight text-white">{item.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-neutral-400">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
