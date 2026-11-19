# Configuration Supabase & Base de Données Distante

La base de données distante de l'application Paie Rafiki est un PostgreSQL hébergé sur Supabase.

> [!IMPORTANT]
> **Règle d'architecture :** Laravel est l'unique propriétaire du schéma distant. L'API REST de Supabase (PostgREST) n'est pas utilisée et est fermée. Toutes les migrations et modifications de structure sont pilotées exclusivement par les migrations Laravel (`php artisan migrate`).

---

## 1. Chaînes de connexion recommandées

Supabase propose deux modes d'accès via PgBouncer / Supavisor :

### A. Connexion directe ou Session Pooler (Recommandé pour Laravel)

- **Port :** `5432` (Direct) ou `5432` (Session mode pooler)
- **Usage :** Idéal pour exécuter les migrations `php artisan migrate`, les transactions longues et les commandes artisan.
- **SSL :** Obligatoire (`sslmode=require`).
- **Exemple de configuration Laravel (`.env`) :**
  ```env
  DB_CONNECTION=pgsql
  DB_HOST=db.xxxxxxxxxxxx.supabase.co
  DB_PORT=5432
  DB_DATABASE=postgres
  DB_USERNAME=postgres
  DB_PASSWORD=votre_mot_de_passe
  DB_SSLMODE=require
  ```

### B. Transaction Pooler (Port 6543)

- **Port :** `6543`
- **Usage :** Utile pour économiser les connexions sous fort trafic.
- **Attention requêtes préparées :** Si le mode transaction est utilisé, il est impératif de désactiver les requêtes préparées émulées dans `config/database.php` :
  ```php
  'pgsql' => [
      // ...
      'options' => [
          PDO::ATTR_EMULATE_PREPARES => false,
      ],
  ],
  ```

---

## 2. Durcissement de la sécurité (Fermeture de l'API REST)

Pour garantir qu'aucun accès non autorisé ne puisse lire ou modifier les données via l'API publique Supabase (`/rest/v1/`), appliquez le script SQL fourni :

```bash
# Exécution dans le SQL Editor du tableau de bord Supabase ou via psql :
supabase/durcissement.sql
```

Ce script :

1. Active le `ROW LEVEL SECURITY` (RLS) sur toutes les tables sans aucune politique (politique par défaut = refus total).
2. Révoque tous les privilèges des rôles `anon` et `authenticated`.
