-- ============================================================================
-- Migration 0002 : Données Banque, Jours Ouvrables, Contraintes Décimales et Déclencheurs
-- 
-- NOTE : La conversion automatique de 804 vers 840 sur les lignes de paie existantes
-- (y compris les opérations terminées) est acceptée et délibérée car il n'existe
-- aucune donnée réelle de production dans l'application (données prototypes/tests uniquement).
-- ============================================================================

-- 1. Paramètre de l'école : ajout du code banque par défaut
ALTER TABLE parametre ADD COLUMN code_banque_defaut TEXT NOT NULL DEFAULT '840';
UPDATE parametre SET code_banque_defaut = '840' WHERE id = 'default';

-- 2. Opération de paie : ajout des jours ouvrables
ALTER TABLE operation_paie ADD COLUMN jours_ouvrables INTEGER CHECK(jours_ouvrables >= 1);

-- Rétro-remplissage avec MAX(jours_ouvrables) sans LIMIT 1
UPDATE operation_paie
SET jours_ouvrables = COALESCE(
    (SELECT MAX(jours_ouvrables) FROM ligne_paie WHERE operation_id = operation_paie.id),
    (SELECT jours_ouvrables_defaut FROM parametre WHERE id = 'default'),
    22
);

-- 3. Reconstruction de la table employe
CREATE TABLE employe_nouvelle (
    id TEXT PRIMARY KEY,
    numero INTEGER NOT NULL UNIQUE CHECK(numero >= 1),
    nom TEXT NOT NULL CHECK(length(trim(nom)) > 0),
    postnom TEXT NOT NULL DEFAULT '',
    prenom TEXT NOT NULL DEFAULT '',
    fonction TEXT NOT NULL DEFAULT '',
    telephone TEXT NOT NULL DEFAULT '',
    code_banque TEXT NOT NULL DEFAULT '',
    salaire_base TEXT NOT NULL CHECK(
        salaire_base NOT GLOB '*[^0-9.]*' 
        AND length(salaire_base) - length(replace(salaire_base, '.', '')) <= 1 
        AND salaire_base NOT GLOB '.*' 
        AND salaire_base NOT GLOB '*.' 
        AND length(salaire_base) > 0
    ),
    actif INTEGER NOT NULL DEFAULT 1 CHECK(actif IN (0, 1)),
    version INTEGER NOT NULL DEFAULT 1 CHECK(version >= 1),
    mis_a_jour_le TEXT NOT NULL,
    supprime_le TEXT
) STRICT;

INSERT INTO employe_nouvelle (
    id, numero, nom, postnom, prenom, fonction, telephone, code_banque, salaire_base, actif, version, mis_a_jour_le, supprime_le
)
SELECT 
    id, numero, nom, postnom, prenom, fonction, telephone,
    CASE WHEN code_banque = '804' THEN '840' ELSE code_banque END,
    salaire_base, actif, version, mis_a_jour_le, supprime_le
FROM employe;

DROP TABLE employe;
ALTER TABLE employe_nouvelle RENAME TO employe;

-- 4. Reconstruction de la table ligne_paie
CREATE TABLE ligne_paie_nouvelle (
    id TEXT PRIMARY KEY,
    operation_id TEXT NOT NULL REFERENCES operation_paie(id) ON DELETE RESTRICT,
    employe_id TEXT NOT NULL REFERENCES employe(id) ON DELETE RESTRICT,
    numero INTEGER NOT NULL CHECK(numero >= 1),
    nom TEXT NOT NULL CHECK(length(trim(nom)) > 0),
    postnom TEXT NOT NULL DEFAULT '',
    prenom TEXT NOT NULL DEFAULT '',
    fonction TEXT NOT NULL DEFAULT '',
    telephone TEXT NOT NULL DEFAULT '',
    code_banque TEXT NOT NULL DEFAULT '',
    salaire_base TEXT NOT NULL CHECK(
        salaire_base NOT GLOB '*[^0-9.]*' 
        AND length(salaire_base) - length(replace(salaire_base, '.', '')) <= 1 
        AND salaire_base NOT GLOB '.*' 
        AND salaire_base NOT GLOB '*.' 
        AND length(salaire_base) > 0
    ),
    hs TEXT NOT NULL DEFAULT '0' CHECK(
        hs NOT GLOB '*[^0-9.]*' 
        AND length(hs) - length(replace(hs, '.', '')) <= 1 
        AND hs NOT GLOB '.*' 
        AND hs NOT GLOB '*.' 
        AND length(hs) > 0
    ),
    retrait TEXT NOT NULL DEFAULT '0' CHECK(
        retrait NOT GLOB '*[^0-9.]*' 
        AND length(retrait) - length(replace(retrait, '.', '')) <= 1 
        AND retrait NOT GLOB '.*' 
        AND retrait NOT GLOB '*.' 
        AND length(retrait) > 0
    ),
    jours_ouvrables INTEGER NOT NULL CHECK(jours_ouvrables >= 1),
    jours_maladie TEXT NOT NULL DEFAULT '0' CHECK(
        jours_maladie NOT GLOB '*[^0-9.]*' 
        AND length(jours_maladie) - length(replace(jours_maladie, '.', '')) <= 1 
        AND jours_maladie NOT GLOB '.*' 
        AND jours_maladie NOT GLOB '*.' 
        AND length(jours_maladie) > 0
    ),
    jours_conge TEXT NOT NULL DEFAULT '0' CHECK(
        jours_conge NOT GLOB '*[^0-9.]*' 
        AND length(jours_conge) - length(replace(jours_conge, '.', '')) <= 1 
        AND jours_conge NOT GLOB '.*' 
        AND jours_conge NOT GLOB '*.' 
        AND length(jours_conge) > 0
    ),
    jours_absence TEXT NOT NULL DEFAULT '0' CHECK(
        jours_absence NOT GLOB '*[^0-9.]*' 
        AND length(jours_absence) - length(replace(jours_absence, '.', '')) <= 1 
        AND jours_absence NOT GLOB '.*' 
        AND jours_absence NOT GLOB '*.' 
        AND length(jours_absence) > 0
    ),
    -- salaire_a_payer : valeurs négatives autorisées (conforme 0001), contrôle de forme strict
    salaire_a_payer TEXT CHECK(
        salaire_a_payer IS NULL OR (
            (CASE WHEN substr(salaire_a_payer, 1, 1) = '-' THEN substr(salaire_a_payer, 2) ELSE salaire_a_payer END) NOT GLOB '*[^0-9.]*' 
            AND length(CASE WHEN substr(salaire_a_payer, 1, 1) = '-' THEN substr(salaire_a_payer, 2) ELSE salaire_a_payer END) - length(replace(CASE WHEN substr(salaire_a_payer, 1, 1) = '-' THEN substr(salaire_a_payer, 2) ELSE salaire_a_payer END, '.', '')) <= 1 
            AND (CASE WHEN substr(salaire_a_payer, 1, 1) = '-' THEN substr(salaire_a_payer, 2) ELSE salaire_a_payer END) NOT GLOB '.*' 
            AND (CASE WHEN substr(salaire_a_payer, 1, 1) = '-' THEN substr(salaire_a_payer, 2) ELSE salaire_a_payer END) NOT GLOB '*.' 
            AND length(CASE WHEN substr(salaire_a_payer, 1, 1) = '-' THEN substr(salaire_a_payer, 2) ELSE salaire_a_payer END) > 0
        )
    ),
    -- jours_prestes : valeurs négatives autorisées (conforme 0001), contrôle de forme strict
    jours_prestes TEXT CHECK(
        jours_prestes IS NULL OR (
            (CASE WHEN substr(jours_prestes, 1, 1) = '-' THEN substr(jours_prestes, 2) ELSE jours_prestes END) NOT GLOB '*[^0-9.]*' 
            AND length(CASE WHEN substr(jours_prestes, 1, 1) = '-' THEN substr(jours_prestes, 2) ELSE jours_prestes END) - length(replace(CASE WHEN substr(jours_prestes, 1, 1) = '-' THEN substr(jours_prestes, 2) ELSE jours_prestes END, '.', '')) <= 1 
            AND (CASE WHEN substr(jours_prestes, 1, 1) = '-' THEN substr(jours_prestes, 2) ELSE jours_prestes END) NOT GLOB '.*' 
            AND (CASE WHEN substr(jours_prestes, 1, 1) = '-' THEN substr(jours_prestes, 2) ELSE jours_prestes END) NOT GLOB '*.' 
            AND length(CASE WHEN substr(jours_prestes, 1, 1) = '-' THEN substr(jours_prestes, 2) ELSE jours_prestes END) > 0
        )
    ),
    retenue_maladie TEXT CHECK(
        retenue_maladie IS NULL OR (
            retenue_maladie NOT GLOB '*[^0-9.]*' 
            AND length(retenue_maladie) - length(replace(retenue_maladie, '.', '')) <= 1 
            AND retenue_maladie NOT GLOB '.*' 
            AND retenue_maladie NOT GLOB '*.' 
            AND length(retenue_maladie) > 0
        )
    ),
    retenue_conge TEXT CHECK(
        retenue_conge IS NULL OR (
            retenue_conge NOT GLOB '*[^0-9.]*' 
            AND length(retenue_conge) - length(replace(retenue_conge, '.', '')) <= 1 
            AND retenue_conge NOT GLOB '.*' 
            AND retenue_conge NOT GLOB '*.' 
            AND length(retenue_conge) > 0
        )
    ),
    retenue_absence TEXT CHECK(
        retenue_absence IS NULL OR (
            retenue_absence NOT GLOB '*[^0-9.]*' 
            AND length(retenue_absence) - length(replace(retenue_absence, '.', '')) <= 1 
            AND retenue_absence NOT GLOB '.*' 
            AND retenue_absence NOT GLOB '*.' 
            AND length(retenue_absence) > 0
        )
    ),
    -- net_global : valeurs négatives autorisées, contrôle de forme strict
    net_global TEXT CHECK(
        net_global IS NULL OR (
            (CASE WHEN substr(net_global, 1, 1) = '-' THEN substr(net_global, 2) ELSE net_global END) NOT GLOB '*[^0-9.]*' 
            AND length(CASE WHEN substr(net_global, 1, 1) = '-' THEN substr(net_global, 2) ELSE net_global END) - length(replace(CASE WHEN substr(net_global, 1, 1) = '-' THEN substr(net_global, 2) ELSE net_global END, '.', '')) <= 1 
            AND (CASE WHEN substr(net_global, 1, 1) = '-' THEN substr(net_global, 2) ELSE net_global END) NOT GLOB '.*' 
            AND (CASE WHEN substr(net_global, 1, 1) = '-' THEN substr(net_global, 2) ELSE net_global END) NOT GLOB '*.' 
            AND length(CASE WHEN substr(net_global, 1, 1) = '-' THEN substr(net_global, 2) ELSE net_global END) > 0
        )
    ),
    virement TEXT CHECK(
        virement IS NULL OR (
            virement NOT GLOB '*[^0-9.]*' 
            AND length(virement) - length(replace(virement, '.', '')) <= 1 
            AND virement NOT GLOB '.*' 
            AND virement NOT GLOB '*.' 
            AND length(virement) > 0
        )
    ),
    version INTEGER NOT NULL DEFAULT 1 CHECK(version >= 1),
    mis_a_jour_le TEXT NOT NULL,
    supprime_le TEXT,
    UNIQUE(operation_id, employe_id)
) STRICT;

INSERT INTO ligne_paie_nouvelle (
    id, operation_id, employe_id, numero, nom, postnom, prenom, fonction,
    telephone, code_banque, salaire_base, hs, retrait, jours_ouvrables,
    jours_maladie, jours_conge, jours_absence,
    salaire_a_payer, jours_prestes, retenue_maladie, retenue_conge, retenue_absence,
    net_global, virement, version, mis_a_jour_le, supprime_le
)
SELECT 
    id, operation_id, employe_id, numero, nom, postnom, prenom, fonction,
    telephone,
    CASE WHEN code_banque = '804' THEN '840' ELSE code_banque END,
    salaire_base, hs, retrait, jours_ouvrables,
    jours_maladie, jours_conge, jours_absence,
    salaire_a_payer, jours_prestes, retenue_maladie, retenue_conge, retenue_absence,
    net_global, virement, version, mis_a_jour_le, supprime_le
FROM ligne_paie;

DROP TABLE ligne_paie;
ALTER TABLE ligne_paie_nouvelle RENAME TO ligne_paie;

-- 5. Recréation des deux index
CREATE INDEX IF NOT EXISTS idx_ligne_paie_operation ON ligne_paie(operation_id);
CREATE INDEX IF NOT EXISTS idx_ligne_paie_employe ON ligne_paie(employe_id);

-- 6. Déclencheurs sur ligne_paie
CREATE TRIGGER IF NOT EXISTS trg_ligne_paie_bloquer_update_si_terminee
BEFORE UPDATE ON ligne_paie
FOR EACH ROW
WHEN (SELECT statut FROM operation_paie WHERE id = OLD.operation_id) = 'terminee'
BEGIN
    SELECT RAISE(ABORT, 'OPERATION_TERMINEE: Modification interdite d''une ligne de paie dont l''opération est terminée.');
END;

CREATE TRIGGER IF NOT EXISTS trg_ligne_paie_bloquer_delete_si_terminee
BEFORE DELETE ON ligne_paie
FOR EACH ROW
WHEN (SELECT statut FROM operation_paie WHERE id = OLD.operation_id) = 'terminee'
BEGIN
    SELECT RAISE(ABORT, 'OPERATION_TERMINEE: Suppression interdite d''une ligne de paie dont l''opération est terminée.');
END;

-- Nouveau déclencheur (Constat E5) : Interdire l'insertion dans une paie terminée
CREATE TRIGGER IF NOT EXISTS trg_ligne_paie_bloquer_insert_si_terminee
BEFORE INSERT ON ligne_paie
FOR EACH ROW
WHEN (SELECT statut FROM operation_paie WHERE id = NEW.operation_id) = 'terminee'
BEGIN
    SELECT RAISE(ABORT, 'OPERATION_TERMINEE: Insertion interdite d''une ligne de paie dans une opération terminée.');
END;
