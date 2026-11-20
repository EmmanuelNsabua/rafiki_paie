import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { z } from 'zod';
import { executerMigrations } from '../src/main/db/migrator';
import { creerGestionnaireSecurise, verifierExpediteur } from '../src/main/ipc';
import { ErreurMetier } from '../src/main/domain/erreurs';

describe('Pont IPC Sécurisé (Validation, Origine, Enveloppe)', () => {
  it('valide l origine de l expéditeur autorisé et rejette les origines externes', () => {
    expect(
      verifierExpediteur({
        senderFrame: { url: 'http://localhost:3000/paie' },
      } as any)
    ).toBe(true);

    expect(
      verifierExpediteur({
        senderFrame: { url: 'http://127.0.0.1:3000/dev/controle' },
      } as any)
    ).toBe(true);

    expect(
      verifierExpediteur({
        senderFrame: { url: 'file:///app/out/index.html' },
      } as any)
    ).toBe(true);

    expect(
      verifierExpediteur({
        senderFrame: { url: 'https://evil-site.com' },
      } as any)
    ).toBe(false);

    expect(
      verifierExpediteur({
        senderFrame: { url: '' },
      } as any)
    ).toBe(false);
  });

  it('valide l entrée via Zod avant tout traitement et rejette les entrées mal formées', async () => {
    const actionSpy = vi.fn();
    const schema = z.object({
      nombre: z.number().int().min(1),
    });

    const handler = creerGestionnaireSecurise('test.canal', schema, actionSpy);

    const eventValide = {
      senderFrame: { url: 'http://localhost:3000' },
    } as any;

    // Entrée invalide (chaîne au lieu d'un nombre >= 1)
    const resInvalide = await handler(eventValide, { nombre: 'texte' });
    expect(resInvalide.ok).toBe(false);
    if (!resInvalide.ok) {
      expect(resInvalide.erreur.code).toBe('VALIDATION_ENTREE_ECHOUEE');
      expect(resInvalide.erreur.message).toContain('nombre');
    }
    expect(actionSpy).not.toHaveBeenCalled();

    // Entrée valide
    actionSpy.mockResolvedValue({ status: 'reussi' });
    const resValide = await handler(eventValide, { nombre: 42 });
    expect(resValide.ok).toBe(true);
    if (resValide.ok) {
      expect(resValide.data).toEqual({ status: 'reussi' });
    }
    expect(actionSpy).toHaveBeenCalledWith({ nombre: 42 });
  });

  it('traduit les ErreurMetier en enveloppe d erreur avec code et message', async () => {
    const schema = z.object({ id: z.string() });
    const handler = creerGestionnaireSecurise('test.metier', schema, () => {
      throw new ErreurMetier('OPERATION_TERMINEE', 'L opération est clôturée.');
    });

    const event = { senderFrame: { url: 'http://localhost:3000' } } as any;
    const res = await handler(event, { id: 'abc' });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.erreur.code).toBe('OPERATION_TERMINEE');
      expect(res.erreur.message).toBe('L opération est clôturée.');
    }
  });

  it('capture les erreurs inattendues sans divulguer d informations sensibles', async () => {
    const schema = z.object({ id: z.string() });
    const handler = creerGestionnaireSecurise('test.inattendu', schema, () => {
      throw new Error('Erreur base de données SQLite');
    });

    const event = { senderFrame: { url: 'http://localhost:3000' } } as any;
    const res = await handler(event, { id: 'abc' });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.erreur.code).toBe('ERREUR_INTERNE');
      expect(res.erreur.message).toBe('Une erreur inattendue est survenue lors du traitement.');
    }
  });
});
