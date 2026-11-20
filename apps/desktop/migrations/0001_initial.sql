-- ============================================================================
-- Migration 0001 : Schéma initial Paie Rafiki (Mode STRICT, Contraintes, Déclencheurs)
-- ============================================================================

-- Table des paramètres généraux
CREATE TABLE IF NOT EXISTS parametre (
    id TEXT PRIMARY KEY,
    devise TEXT NOT NULL DEFAULT 'USD',
    jours_ouvrables_defaut INTEGER NOT NULL DEFAULT 22 CHECK(jours_ouvrables_defaut >= 1),
    diviseur_retenue INTEGER NOT NULL DEFAULT 3 CHECK(diviseur_retenue >= 1),
    unite_arrondi INTEGER NOT NULL DEFAULT 10 CHECK(unite_arrondi >= 1),
    version INTEGER NOT NULL DEFAULT 1 CHECK(version >= 1),
    mis_a_jour_le TEXT NOT NULL
) STRICT;

-- Insertion des paramètres par défaut
INSERT OR IGNORE INTO parametre (id, devise, jours_ouvrables_defaut, diviseur_retenue, unite_arrondi, version, mis_a_jour_le)
VALUES ('default', 'USD', 22, 3, 10, 1, '2026-01-01T00:00:00.000Z');

-- Table des employés
CREATE TABLE IF NOT EXISTS employe (
    id TEXT PRIMARY KEY,
    numero INTEGER NOT NULL UNIQUE CHECK(numero >= 1),
    nom TEXT NOT NULL CHECK(length(trim(nom)) > 0),
    postnom TEXT NOT NULL DEFAULT '',
    prenom TEXT NOT NULL DEFAULT '',
    fonction TEXT NOT NULL DEFAULT '',
    telephone TEXT NOT NULL DEFAULT '',
    code_banque TEXT NOT NULL DEFAULT '804',
    salaire_base TEXT NOT NULL CHECK(salaire_base GLOB '[0-9]*' OR salaire_base GLOB '[0-9]*.[0-9]*'),
    actif INTEGER NOT NULL DEFAULT 1 CHECK(actif IN (0, 1)),
    version INTEGER NOT NULL DEFAULT 1 CHECK(version >= 1),
    mis_a_jour_le TEXT NOT NULL,
    supprime_le TEXT
) STRICT;

-- Table des opérations de paie mensuelles
CREATE TABLE IF NOT EXISTS operation_paie (
    id TEXT PRIMARY KEY,
    annee INTEGER NOT NULL CHECK(annee >= 2000 AND annee <= 2100),
    mois INTEGER NOT NULL CHECK(mois >= 1 AND mois <= 12),
    statut TEXT NOT NULL DEFAULT 'ouverte' CHECK(statut IN ('ouverte', 'terminee')),
    terminee_le TEXT,
    version INTEGER NOT NULL DEFAULT 1 CHECK(version >= 1),
    mis_a_jour_le TEXT NOT NULL,
    supprime_le TEXT,
    UNIQUE(annee, mois)
) STRICT;

-- Table des lignes de paie
CREATE TABLE IF NOT EXISTS ligne_paie (
    id TEXT PRIMARY KEY,
    operation_id TEXT NOT NULL REFERENCES operation_paie(id) ON DELETE RESTRICT,
    employe_id TEXT NOT NULL REFERENCES employe(id) ON DELETE RESTRICT,
    numero INTEGER NOT NULL CHECK(numero >= 1),
    nom TEXT NOT NULL CHECK(length(trim(nom)) > 0),
    postnom TEXT NOT NULL DEFAULT '',
    prenom TEXT NOT NULL DEFAULT '',
    fonction TEXT NOT NULL DEFAULT '',
    telephone TEXT NOT NULL DEFAULT '',
    code_banque TEXT NOT NULL DEFAULT '804',
    salaire_base TEXT NOT NULL CHECK(salaire_base GLOB '[0-9]*' OR salaire_base GLOB '[0-9]*.[0-9]*'),
    hs TEXT NOT NULL DEFAULT '0' CHECK(hs GLOB '[0-9]*' OR hs GLOB '[0-9]*.[0-9]*'),
    retrait TEXT NOT NULL DEFAULT '0' CHECK(retrait GLOB '[0-9]*' OR retrait GLOB '[0-9]*.[0-9]*'),
    jours_ouvrables INTEGER NOT NULL CHECK(jours_ouvrables >= 1),
    jours_maladie TEXT NOT NULL DEFAULT '0' CHECK(jours_maladie GLOB '[0-9]*' OR jours_maladie GLOB '[0-9]*.[0-9]*'),
    jours_conge TEXT NOT NULL DEFAULT '0' CHECK(jours_conge GLOB '[0-9]*' OR jours_conge GLOB '[0-9]*.[0-9]*'),
    jours_absence TEXT NOT NULL DEFAULT '0' CHECK(jours_absence GLOB '[0-9]*' OR jours_absence GLOB '[0-9]*.[0-9]*'),
    salaire_a_payer TEXT CHECK(salaire_a_payer IS NULL OR salaire_a_payer GLOB '[0-9]*' OR salaire_a_payer GLOB '[0-9]*.[0-9]*' OR salaire_a_payer GLOB '-[0-9]*' OR salaire_a_payer GLOB '-[0-9]*.[0-9]*'),
    jours_prestes TEXT CHECK(jours_prestes IS NULL OR jours_prestes GLOB '[0-9]*' OR jours_prestes GLOB '[0-9]*.[0-9]*' OR jours_prestes GLOB '-[0-9]*' OR jours_prestes GLOB '-[0-9]*.[0-9]*'),
    retenue_maladie TEXT CHECK(retenue_maladie IS NULL OR retenue_maladie GLOB '[0-9]*' OR retenue_maladie GLOB '[0-9]*.[0-9]*'),
    retenue_conge TEXT CHECK(retenue_conge IS NULL OR retenue_conge GLOB '[0-9]*' OR retenue_conge GLOB '[0-9]*.[0-9]*'),
    retenue_absence TEXT CHECK(retenue_absence IS NULL OR retenue_absence GLOB '[0-9]*' OR retenue_absence GLOB '[0-9]*.[0-9]*'),
    net_global TEXT CHECK(net_global IS NULL OR net_global GLOB '[0-9]*' OR net_global GLOB '[0-9]*.[0-9]*' OR net_global GLOB '-[0-9]*' OR net_global GLOB '-[0-9]*.[0-9]*'),
    virement TEXT CHECK(virement IS NULL OR virement GLOB '[0-9]*' OR virement GLOB '[0-9]*.[0-9]*'),
    version INTEGER NOT NULL DEFAULT 1 CHECK(version >= 1),
    mis_a_jour_le TEXT NOT NULL,
    supprime_le TEXT,
    UNIQUE(operation_id, employe_id)
) STRICT;

CREATE INDEX IF NOT EXISTS idx_ligne_paie_operation ON ligne_paie(operation_id);
CREATE INDEX IF NOT EXISTS idx_ligne_paie_employe ON ligne_paie(employe_id);

-- Table du journal d'audit
CREATE TABLE IF NOT EXISTS journal (
    id TEXT PRIMARY KEY,
    horodatage TEXT NOT NULL,
    action TEXT NOT NULL CHECK(length(trim(action)) > 0),
    entite TEXT NOT NULL CHECK(length(trim(entite)) > 0),
    entite_id TEXT NOT NULL DEFAULT '',
    detail TEXT NOT NULL DEFAULT ''
) STRICT;

-- ============================================================================
-- Déclencheurs (Triggers) d'intégrité et d'immutabilité
-- ============================================================================

-- Interdire toute modification d'une ligne_paie dont l'opération est terminée
CREATE TRIGGER IF NOT EXISTS trg_ligne_paie_bloquer_update_si_terminee
BEFORE UPDATE ON ligne_paie
FOR EACH ROW
WHEN (SELECT statut FROM operation_paie WHERE id = OLD.operation_id) = 'terminee'
BEGIN
    SELECT RAISE(ABORT, 'OPERATION_TERMINEE: Modification interdite d''une ligne de paie dont l''opération est terminée.');
END;

-- Interdire toute suppression d'une ligne_paie dont l'opération est terminée
CREATE TRIGGER IF NOT EXISTS trg_ligne_paie_bloquer_delete_si_terminee
BEFORE DELETE ON ligne_paie
FOR EACH ROW
WHEN (SELECT statut FROM operation_paie WHERE id = OLD.operation_id) = 'terminee'
BEGIN
    SELECT RAISE(ABORT, 'OPERATION_TERMINEE: Suppression interdite d''une ligne de paie dont l''opération est terminée.');
END;

-- Interdire toute modification d'une ligne du journal (ajout seul)
CREATE TRIGGER IF NOT EXISTS trg_journal_bloquer_update
BEFORE UPDATE ON journal
FOR EACH ROW
BEGIN
    SELECT RAISE(ABORT, 'JOURNAL_IMMUTABLE: Modification interdite dans le journal d''audit.');
END;

-- Interdire toute suppression d'une ligne du journal (ajout seul)
CREATE TRIGGER IF NOT EXISTS trg_journal_bloquer_delete
BEFORE DELETE ON journal
FOR EACH ROW
BEGIN
    SELECT RAISE(ABORT, 'JOURNAL_IMMUTABLE: Suppression interdite dans le journal d''audit.');
END;
