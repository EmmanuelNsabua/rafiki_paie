'use client';

import * as React from 'react';
import { type ThemePreference, type PreferencesInterface } from '@rafiki/contrat';
import { api, estDansElectron } from '@/lib/api';
import { Minus, Square, Copy, X, RotateCcw, Monitor, Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StarclipLogo } from '@/components/layout/starclip-logo';

export function BarreTitre() {
  const [menuOuvert, setMenuOuvert] = React.useState(false);
  const [estAgrandi, setEstAgrandi] = React.useState(false);
  const [tailleTexte, setTailleTexte] = React.useState(14);
  const [zoom, setZoom] = React.useState(1.0);
  const [theme, setTheme] = React.useState<ThemePreference>('systeme');
  const [version, setVersion] = React.useState('0.1.1');
  const popoverRef = React.useRef<HTMLDivElement>(null);
  const boutonLogoRef = React.useRef<HTMLButtonElement>(null);

  // Appliquer l'échelle de texte sur la racine CSS
  const appliquerTailleTexte = React.useCallback((taille: number) => {
    setTailleTexte(taille);
    if (typeof document !== 'undefined') {
      const echelle = taille / 14;
      document.documentElement.style.setProperty('--echelle-texte', String(echelle));
    }
  }, []);

  const appliquerTheme = React.useCallback((nouveauTheme: ThemePreference) => {
    setTheme(nouveauTheme);
    if (typeof document !== 'undefined') {
      if (nouveauTheme === 'systeme') {
        delete document.documentElement.dataset.theme;
      } else {
        document.documentElement.dataset.theme = nouveauTheme;
      }
    }
  }, []);

  // Chargement initial des préférences et abonnements
  React.useEffect(() => {
    if (!estDansElectron()) return;

    api.fenetre
      .lirePreferences()
      .then((infos) => {
        setEstAgrandi(infos.estAgrandi);
        setVersion(infos.version || '0.1.1');
        if (infos.preferences) {
          const { tailleTexte: t, zoom: z, theme: th } = infos.preferences;
          if (t) appliquerTailleTexte(t);
          if (z) setZoom(z);
          if (th) appliquerTheme(th);
        }
      })
      .catch(() => {});

    const cleanupAgrandi = api.fenetre.surChangementEtatAgrandi((agrandi) => {
      setEstAgrandi(agrandi);
    });

    const cleanupPrefs = api.fenetre.surChangementPreferences((prefs: PreferencesInterface) => {
      if (prefs.tailleTexte) appliquerTailleTexte(prefs.tailleTexte);
      if (prefs.zoom) setZoom(prefs.zoom);
      if (prefs.theme) appliquerTheme(prefs.theme);
    });

    const cleanupSysteme = api.fenetre.surChangementThemeSysteme?.((themeSysteme) => {
      if (theme === 'systeme' && typeof document !== 'undefined') {
        document.documentElement.dataset.theme = themeSysteme;
      }
    });

    return () => {
      cleanupAgrandi();
      cleanupPrefs();
      cleanupSysteme?.();
    };
  }, [appliquerTailleTexte, appliquerTheme]);

  // Fermeture du menu si clic extérieur ou touche Échap
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        boutonLogoRef.current &&
        !boutonLogoRef.current.contains(e.target as Node)
      ) {
        setMenuOuvert(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && menuOuvert) {
        setMenuOuvert(false);
        boutonLogoRef.current?.focus();
      }
    }

    if (menuOuvert) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOuvert]);

  // Actions de modification d'affichage (ne ferment pas le menu)
  const modifierTaille = async (delta: number) => {
    const nouvelleTaille = Math.max(12, Math.min(20, tailleTexte + delta));
    appliquerTailleTexte(nouvelleTaille);
    if (estDansElectron()) {
      await api.fenetre.definirTailleTexte(nouvelleTaille).catch(() => {});
    }
  };

  const retablirTaille = async () => {
    appliquerTailleTexte(14);
    if (estDansElectron()) {
      await api.fenetre.definirTailleTexte(14).catch(() => {});
    }
  };

  const modifierZoom = async (delta: number) => {
    const nouveauZoom = Math.max(0.5, Math.min(2.0, Math.round((zoom + delta) * 10) / 10));
    setZoom(nouveauZoom);
    if (estDansElectron()) {
      await api.fenetre.definirZoom(nouveauZoom).catch(() => {});
    }
  };

  const retablirZoom = async () => {
    setZoom(1.0);
    if (estDansElectron()) {
      await api.fenetre.definirZoom(1.0).catch(() => {});
    }
  };

  const changerTheme = async (nouveauTheme: ThemePreference) => {
    appliquerTheme(nouveauTheme);
    if (estDansElectron()) {
      await api.fenetre.definirTheme(nouveauTheme).catch(() => {});
    }
  };

  // Actions de fenêtre (ferment le menu)
  const reduireFenetre = () => {
    setMenuOuvert(false);
    if (estDansElectron()) {
      api.fenetre.reduire().catch(() => {});
    }
  };

  const basculerAgrandissement = () => {
    setMenuOuvert(false);
    if (estDansElectron()) {
      api.fenetre
        .basculerAgrandissement()
        .then((res) => {
          setEstAgrandi(res.estAgrandi);
        })
        .catch(() => {});
    }
  };

  const fermerFenetre = () => {
    setMenuOuvert(false);
    if (estDansElectron()) {
      api.fenetre.fermer().catch(() => {});
    }
  };

  const redemarrerApp = () => {
    setMenuOuvert(false);
    if (estDansElectron()) {
      api.fenetre.redemarrer().catch(() => {});
    }
  };

  return (
    <div
      data-testid="barre-titre"
      className="fixed top-0 left-0 right-0 h-[2.286rem] bg-[var(--fenetre)] z-40 select-none flex items-center justify-between pl-[0.571rem] pr-0"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      onDoubleClick={basculerAgrandissement}
    >
      {/* Zone gauche : Logo + Titre */}
      <div className="flex items-center gap-[0.571rem]">
        {/* Bouton du Logo */}
        <button
          ref={boutonLogoRef}
          type="button"
          aria-label="Menu de l'application"
          title="Menu de l'application"
          aria-haspopup="menu"
          aria-expanded={menuOuvert}
          onClick={(e) => {
            e.stopPropagation();
            setMenuOuvert((prev) => !prev);
          }}
          className="w-[1.429rem] h-[1.429rem] rounded-[4px] overflow-hidden bg-white border border-[var(--border)] flex items-center justify-center shadow-xs hover:opacity-90 active:scale-95 transition-all outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] shrink-0"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <StarclipLogo className="w-full h-full" />
        </button>

        {/* Titre de la fenêtre */}
        <span className="text-[12px] leading-[16px] font-medium text-[var(--texte)]">
          École RAFIKI — Gestionnaire de paie
        </span>
      </div>

      {/* Zone droite : Boutons de contrôle de la fenêtre (Réduire, Agrandir/Restaurer, Fermer) */}
      <div
        data-testid="controles-fenetre"
        className="flex items-center h-full"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          type="button"
          aria-label="Réduire"
          title="Réduire"
          onClick={reduireFenetre}
          className="w-[2.857rem] h-full flex items-center justify-center text-[var(--texte)] hover:bg-[var(--survol)] active:bg-[var(--survol)] transition-colors outline-none"
        >
          <Minus className="w-[12px] h-[12px]" />
        </button>

        <button
          type="button"
          aria-label={estAgrandi ? 'Restaurer' : 'Agrandir'}
          title={estAgrandi ? 'Restaurer' : 'Agrandir'}
          onClick={basculerAgrandissement}
          className="w-[2.857rem] h-full flex items-center justify-center text-[var(--texte)] hover:bg-[var(--survol)] active:bg-[var(--survol)] transition-colors outline-none"
        >
          {estAgrandi ? (
            <Copy className="w-[11px] h-[11px]" />
          ) : (
            <Square className="w-[11px] h-[11px]" />
          )}
        </button>

        <button
          type="button"
          aria-label="Fermer"
          title="Fermer (Alt+F4)"
          onClick={fermerFenetre}
          className="w-[2.857rem] h-full flex items-center justify-center text-[var(--texte)] hover:bg-[#e81123] hover:text-white active:bg-[#c4101f] active:text-white transition-colors outline-none"
        >
          <X className="w-[14px] h-[14px]" />
        </button>
      </div>

      {/* Menu du Logo (Popover flottant) */}
      {menuOuvert && (
        <div
          ref={popoverRef}
          role="menu"
          aria-orientation="vertical"
          className="absolute top-[2.5rem] left-[0.571rem] w-[300px] rounded-[8px] bg-[var(--carte)] text-[13px] border border-[var(--trait)] shadow-xl p-[0.857rem] flex flex-col gap-[0.714rem] z-50 text-[var(--texte)]"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          {/* Section 1 : Affichage */}
          <div className="flex flex-col gap-[0.571rem] pb-[0.714rem] border-b border-[var(--trait)]">
            <span className="text-[11px] font-semibold text-[var(--texte-2)] uppercase tracking-wider">
              Affichage
            </span>

            {/* Taille du texte */}
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[var(--texte)]">Taille du texte</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => modifierTaille(-1)}
                  disabled={tailleTexte <= 12}
                  className="w-[1.714rem] h-[1.714rem] rounded-[4px] border border-[var(--trait)] hover:bg-[var(--survol)] active:scale-95 disabled:opacity-40 flex items-center justify-center font-bold"
                  title="Diminuer la taille du texte"
                >
                  −
                </button>
                <span className="w-[3rem] text-center font-mono text-[12px]">{tailleTexte} px</span>
                <button
                  type="button"
                  onClick={() => modifierTaille(1)}
                  disabled={tailleTexte >= 20}
                  className="w-[1.714rem] h-[1.714rem] rounded-[4px] border border-[var(--trait)] hover:bg-[var(--survol)] active:scale-95 disabled:opacity-40 flex items-center justify-center font-bold"
                  title="Augmenter la taille du texte"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={retablirTaille}
                  disabled={tailleTexte === 14}
                  className="text-[11px] ml-1 text-[var(--texte-2)] hover:text-[var(--texte)] disabled:opacity-40"
                >
                  Rétablir
                </button>
              </div>
            </div>

            {/* Zoom */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[13px] text-[var(--texte)]">Zoom</span>
                <span className="text-[10px] text-[var(--texte-2)]">Ctrl+− / Ctrl++</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => modifierZoom(-0.1)}
                  disabled={zoom <= 0.5}
                  className="w-[1.714rem] h-[1.714rem] rounded-[4px] border border-[var(--trait)] hover:bg-[var(--survol)] active:scale-95 disabled:opacity-40 flex items-center justify-center font-bold"
                  title="Zoom arrière"
                >
                  −
                </button>
                <span className="w-[3.2rem] text-center font-mono text-[12px]">
                  {Math.round(zoom * 100)} %
                </span>
                <button
                  type="button"
                  onClick={() => modifierZoom(0.1)}
                  disabled={zoom >= 2.0}
                  className="w-[1.714rem] h-[1.714rem] rounded-[4px] border border-[var(--trait)] hover:bg-[var(--survol)] active:scale-95 disabled:opacity-40 flex items-center justify-center font-bold"
                  title="Zoom avant"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={retablirZoom}
                  disabled={zoom === 1.0}
                  className="text-[11px] ml-1 text-[var(--texte-2)] hover:text-[var(--texte)] disabled:opacity-40"
                >
                  Rétablir
                </button>
              </div>
            </div>

            {/* Thème */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[13px] text-[var(--texte)]">Thème</span>
              <div className="flex rounded-[6px] border border-[var(--trait)] p-[2px] bg-[var(--fenetre)] gap-[2px]">
                <button
                  type="button"
                  onClick={() => changerTheme('systeme')}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded-[4px] text-[11px] font-medium transition-all',
                    theme === 'systeme'
                      ? 'bg-[var(--carte)] text-[var(--texte)] shadow-xs'
                      : 'text-[var(--texte-2)] hover:text-[var(--texte)]'
                  )}
                  title="Suivre le thème du système"
                >
                  <Monitor className="w-[12px] h-[12px]" />
                  Système
                </button>
                <button
                  type="button"
                  onClick={() => changerTheme('clair')}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded-[4px] text-[11px] font-medium transition-all',
                    theme === 'clair'
                      ? 'bg-[var(--carte)] text-[var(--texte)] shadow-xs'
                      : 'text-[var(--texte-2)] hover:text-[var(--texte)]'
                  )}
                  title="Thème clair"
                >
                  <Sun className="w-[12px] h-[12px]" />
                  Clair
                </button>
                <button
                  type="button"
                  onClick={() => changerTheme('sombre')}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded-[4px] text-[11px] font-medium transition-all',
                    theme === 'sombre'
                      ? 'bg-[var(--carte)] text-[var(--texte)] shadow-xs'
                      : 'text-[var(--texte-2)] hover:text-[var(--texte)]'
                  )}
                  title="Thème sombre"
                >
                  <Moon className="w-[12px] h-[12px]" />
                  Sombre
                </button>
              </div>
            </div>
          </div>

          {/* Section 2 : Fenêtre */}
          <div className="flex flex-col gap-[0.286rem] pb-[0.714rem] border-b border-[var(--trait)]">
            <span className="text-[11px] font-semibold text-[var(--texte-2)] uppercase tracking-wider">
              Fenêtre
            </span>
            <button
              type="button"
              role="menuitem"
              onClick={reduireFenetre}
              className="flex items-center gap-[0.571rem] px-[0.571rem] py-[0.429rem] rounded-[4px] hover:bg-[var(--survol)] text-left transition-all"
            >
              <Minus className="w-[14px] h-[14px] text-[var(--texte-2)]" />
              <span>Réduire</span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={basculerAgrandissement}
              className="flex items-center gap-[0.571rem] px-[0.571rem] py-[0.429rem] rounded-[4px] hover:bg-[var(--survol)] text-left transition-all"
            >
              {estAgrandi ? (
                <>
                  <Copy className="w-[14px] h-[14px] text-[var(--texte-2)]" />
                  <span>Restaurer</span>
                </>
              ) : (
                <>
                  <Square className="w-[14px] h-[14px] text-[var(--texte-2)]" />
                  <span>Agrandir</span>
                </>
              )}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={fermerFenetre}
              className="flex items-center justify-between px-[0.571rem] py-[0.429rem] rounded-[4px] hover:bg-[var(--danger-tint)] hover:text-[var(--danger)] text-left transition-all"
            >
              <div className="flex items-center gap-[0.571rem]">
                <X className="w-[14px] h-[14px]" />
                <span>Fermer</span>
              </div>
              <span className="text-[11px] text-[var(--texte-2)]">Alt+F4</span>
            </button>
          </div>

          {/* Section 3 : Application */}
          <div className="flex flex-col gap-[0.429rem]">
            <button
              type="button"
              role="menuitem"
              onClick={redemarrerApp}
              className="flex items-center gap-[0.571rem] px-[0.571rem] py-[0.429rem] rounded-[4px] hover:bg-[var(--survol)] text-left transition-all"
            >
              <RotateCcw className="w-[14px] h-[14px] text-[var(--texte-2)]" />
              <span>Redémarrer l&apos;application</span>
            </button>
            <div className="text-[11px] text-[var(--texte-2)] px-[0.571rem] pt-1">
              Version {version}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
