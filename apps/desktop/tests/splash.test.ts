import { describe, it, expect } from 'vitest';
import { obtenirHtmlSplashScreen } from '../src/main/splash';

describe('Splash Screen (Démarrage élégant type DBeaver)', () => {
  it('génère un HTML valide avec la structure visuelle Starclip et DBeaver', () => {
    const html = obtenirHtmlSplashScreen();

    expect(html).toContain('Starclip');
    expect(html).toContain('PAIE RAFIKI');
    expect(html).toContain('Gestionnaire de paie');
    expect(html).toContain('status-text');
    expect(html).toContain('progress-bar');
    expect(html).toContain('percent-text');
    expect(html).toContain('window.updateStatus');
  });

  it('embarque l icone SVG officielle sans dépendance réseau ou disque', () => {
    const html = obtenirHtmlSplashScreen();

    expect(html).toContain('<svg');
    expect(html).toContain('viewBox="0 0 150 150"');
    expect(html).toContain('M74.6649');
  });
});
