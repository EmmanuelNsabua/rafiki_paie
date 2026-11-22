-- ============================================================================
-- Migration 0003 : Retrait de la valeur par défaut SQL sur parametre.code_banque_defaut
-- ============================================================================

-- Reconstruction de la table parametre pour supprimer le DEFAULT '840' permanent
-- tout en préservant la valeur initiale et les données existantes.
CREATE TABLE parametre_nouvelle (
    id TEXT PRIMARY KEY,
    devise TEXT NOT NULL DEFAULT 'USD',
    jours_ouvrables_defaut INTEGER NOT NULL DEFAULT 22 CHECK(jours_ouvrables_defaut >= 1),
    diviseur_retenue INTEGER NOT NULL DEFAULT 3 CHECK(diviseur_retenue >= 1),
    unite_arrondi INTEGER NOT NULL DEFAULT 10 CHECK(unite_arrondi >= 1),
    code_banque_defaut TEXT NOT NULL CHECK(length(trim(code_banque_defaut)) > 0),
    version INTEGER NOT NULL DEFAULT 1 CHECK(version >= 1),
    mis_a_jour_le TEXT NOT NULL
) STRICT;

INSERT INTO parametre_nouvelle (
    id, devise, jours_ouvrables_defaut, diviseur_retenue, unite_arrondi, code_banque_defaut, version, mis_a_jour_le
)
SELECT id, devise, jours_ouvrables_defaut, diviseur_retenue, unite_arrondi, code_banque_defaut, version, mis_a_jour_le
FROM parametre;

DROP TABLE parametre;
ALTER TABLE parametre_nouvelle RENAME TO parametre;
