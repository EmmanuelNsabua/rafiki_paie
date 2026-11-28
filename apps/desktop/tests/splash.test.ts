import { describe, it, expect } from 'vitest';
import { obtenirHtmlSplashScreen } from '../src/main/splash';

describe('Splash Screen (Couleurs et logo officiel École RAFIKI)', () => {
  it('génère un HTML valide avec la structure visuelle École RAFIKI et les couleurs de l école', () => {
    const html = obtenirHtmlSplashScreen();

    expect(html).toContain('École RAFIKI');
    expect(html).toContain('ÉCOLE RAFIKI');
    expect(html).toContain('Gestionnaire de paie');
    expect(html).toContain('#168FB8');
    expect(html).toContain('#8CD16D');
    expect(html).toContain('#7A421D');
    expect(html).toContain('status-text');
    expect(html).toContain('progress-bar');
    expect(html).toContain('percent-text');
    expect(html).toContain('window.updateStatus');
  });

  it('embarque le logo officiel de l école en base64 inline sans dépendance disque et affiche la version dynamique', () => {
    const html = obtenirHtmlSplashScreen();

    expect(html).toContain('<img');
    expect(html).toContain('data:image/jpeg;base64,');
    expect(html).toMatch(/class="version-badge">v\d+\.\d+\.\d+</);
  });
});
