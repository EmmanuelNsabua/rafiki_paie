import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { CANAUX_IPC } from '@rafiki/contrat/canaux';

describe('Parité stricte des canaux IPC (Contrat, Preload, Main)', () => {
  it('garantit que tout canal du contrat est exposé par le preload et géré par le processus principal, et inversement', () => {
    // 1. Liste officielle des canaux du contrat
    const canauxContrat = Object.values(CANAUX_IPC);
    expect(canauxContrat.length).toBeGreaterThan(0);

    // 2. Extraction des canaux utilisés dans le preload
    const preloadPath = path.resolve(__dirname, '../src/preload/index.ts');
    const preloadContent = fs.readFileSync(preloadPath, 'utf8');

    // Récupère les références CANAUX_IPC.NOM dans preload
    const preloadMatches = preloadContent.match(/CANAUX_IPC\.([A-Z_]+)/g) || [];
    const canauxPreload = Array.from(
      new Set(
        preloadMatches.map((m) => {
          const cle = m.replace('CANAUX_IPC.', '') as keyof typeof CANAUX_IPC;
          return CANAUX_IPC[cle];
        })
      )
    );

    // 3. Extraction des gestionnaires enregistrés dans le processus principal
    const ipcIndexPath = path.resolve(__dirname, '../src/main/ipc/index.ts');
    const fenetreIpcPath = path.resolve(__dirname, '../src/main/ipc/fenetre-ipc.ts');
    const mainIndexPath = path.resolve(__dirname, '../src/main/index.ts');

    const mainContent = [
      fs.readFileSync(ipcIndexPath, 'utf8'),
      fs.readFileSync(fenetreIpcPath, 'utf8'),
      fs.readFileSync(mainIndexPath, 'utf8'),
    ].join('\n');

    const mainMatches = mainContent.match(/CANAUX_IPC\.([A-Z_]+)/g) || [];
    const canauxMain = Array.from(
      new Set(
        mainMatches.map((m) => {
          const cle = m.replace('CANAUX_IPC.', '') as keyof typeof CANAUX_IPC;
          return CANAUX_IPC[cle];
        })
      )
    );

    // Vérification de la parité complète (écart = vide)
    const manqueDansPreload = canauxContrat.filter((c) => !canauxPreload.includes(c));
    const surplusDansPreload = canauxPreload.filter((c) => !canauxContrat.includes(c as any));

    const manqueDansMain = canauxContrat.filter((c) => !canauxMain.includes(c));
    const surplusDansMain = canauxMain.filter((c) => !canauxContrat.includes(c as any));

    expect(manqueDansPreload, 'Canaux du contrat manquants dans le preload').toEqual([]);
    expect(surplusDansPreload, 'Canaux en surplus dans le preload').toEqual([]);

    expect(manqueDansMain, 'Canaux du contrat manquants dans le processus principal').toEqual([]);
    expect(surplusDansMain, 'Canaux en surplus dans le processus principal').toEqual([]);

    expect(canauxPreload.sort()).toEqual(canauxContrat.slice().sort());
    expect(canauxMain.sort()).toEqual(canauxContrat.slice().sort());
  });
});
