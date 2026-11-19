-- Script de durcissement SQL pour Supabase — Projet Paie Rafiki
-- Ce script active la sécurité par ligne (Row Level Security - RLS) sans politique
-- sur l'ensemble des tables du schéma public, afin de fermer complètement l'accès
-- direct via l'API REST PostgREST de Supabase.
-- Laravel est la seule porte d'entrée autorisée (via connexion PostgreSQL directe / pooler).

-- Activer RLS sur les tables existantes
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
        EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY;', r.tablename);
    END LOOP;
END $$;

-- Révocation des privilèges par défaut pour le rôle anon et authenticated de Supabase
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon, authenticated;

-- Sécurité par défaut sur les futures tables créées
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON ROUTINES FROM anon, authenticated;
