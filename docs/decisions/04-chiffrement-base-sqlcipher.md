# Décision technique : Préparation de l'ouverture sécurisée et du chiffrement (SQLCipher)

## 1. Contexte

La base de données locale de l'application Paie Rafiki stocke des données sensibles de paie et d'identification des employés (salaires, coordonnées bancaires, numéros de téléphone).

Pour la Phase 1, la base s'appuie sur `better-sqlite3` standard avec mode WAL et contraintes d'intégrité strictes.

## 2. Décision

Afin de permettre l'activation future d'un chiffrement complet au repos (via SQLCipher ou chiffrement transparent) sans modifier l'architecture ni casser les contrats d'appel, le module `ouvrirBaseDeDonnees` (`apps/desktop/src/main/db/database.ts`) accepte dès à présent un paramètre optionnel `cleChiffrement: string`.

- **Comportement actuel** : Si la clé est passée, l'appel tente l'instruction `PRAGMA key = ...`. Sur une version standard de SQLite sans support de chiffrement, l'instruction est sans effet ou ignorée.
- **Évolution future** : Lorsqu'une dépendance compatible SQLCipher sera intégrée (par exemple via build spécifique ou bibliothèque de chiffrement Electron `safeStorage`), la clé d'ouverture pourra être injectée immédiatement à cet emplacement sans restructurer la couche d'accès aux données.

Cette conception garantit l'extensibilité de la sécurité locale sans dette technique.
