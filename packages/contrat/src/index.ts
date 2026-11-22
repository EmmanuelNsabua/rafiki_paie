import { z } from 'zod';

// ============================================================================
// Primitives & Validateurs
// ============================================================================

/**
 * Chaîne représentant un montant décimal exact ou nombre fractionnaire >= 0.
 * Format strict : "123", "123.45", "0", "0.545455".
 */
export const decimalNonNegatifSchema = z
  .string()
  .regex(/^\d+(\.\d+)?$/, 'Doit être un nombre décimal positif ou nul.');

/**
 * Chaîne représentant un décimal éventuellement signé (ex: écart d'arrondi négatif).
 */
export const decimalSigneSchema = z
  .string()
  .regex(/^-?\d+(\.\d+)?$/, 'Doit être un nombre décimal valide.');

/**
 * Identifiant UUID v4 au format texte.
 */
export const uuidSchema = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    'Doit être un UUID valide.'
  );

/**
 * Date et heure au format ISO 8601 UTC.
 */
export const dateIsoSchema = z
  .string()
  .datetime({ offset: true })
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/));

/**
 * Numéro de téléphone validé : après suppression des espaces, points et tirets,
 * contient de 9 à 15 chiffres avec un '+' facultatif en tête.
 */
export const telephoneSchema = z.string().refine(
  (val) => {
    if (!val || val.trim() === '') return true;
    const nettoye = val.replace(/[\s.-]/g, '');
    return /^\+?\d{9,15}$/.test(nettoye);
  },
  {
    message:
      "Le numéro de téléphone doit contenir entre 9 et 15 chiffres (après suppression des espaces, points et tirets), avec un '+' facultatif en tête.",
  }
);

/**
 * Valide un numéro de téléphone pour un employé destiné au bordereau bancaire.
 * Le numéro ne peut être ni vide ni composé uniquement d'espaces.
 */
export function validerTelephoneBeneficiaire(tel: string | null | undefined): {
  valide: boolean;
  erreur?: string;
} {
  if (!tel || tel.trim() === '') {
    return {
      valide: false,
      erreur:
        'Le numéro de téléphone est obligatoire pour figurer comme bénéficiaire au bordereau.',
    };
  }
  const nettoye = tel.replace(/[\s.-]/g, '');
  if (!/^\+?\d{9,15}$/.test(nettoye)) {
    return {
      valide: false,
      erreur:
        "Le numéro de téléphone doit contenir entre 9 et 15 chiffres (après suppression des espaces, points et tirets), avec un '+' facultatif en tête.",
    };
  }
  return { valide: true };
}

/**
 * Schéma Zod strict pour le numéro de téléphone d'un bénéficiaire au bordereau bancaire.
 * Rejette les chaînes vides, les espaces et les formats non conformes.
 */
export const telephoneBeneficiaireSchema = z.string().superRefine((val, ctx) => {
  const res = validerTelephoneBeneficiaire(val);
  if (!res.valide) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: res.erreur ?? 'Numéro de téléphone invalide.',
    });
  }
});

// ============================================================================
// Entités du Modèle de Données (modele-donnees-phase-1.mermaid)
// ============================================================================

export const parametreSchema = z.object({
  id: z.string(),
  devise: z.literal('USD').default('USD'),
  jours_ouvrables_defaut: z.number().int().min(1),
  diviseur_retenue: z.number().int().min(1).default(3),
  unite_arrondi: z.number().int().min(1).default(10),
  code_banque_defaut: z.string().min(1),
  version: z.number().int().min(1).default(1),
  mis_a_jour_le: z.string(),
});
export type Parametre = z.infer<typeof parametreSchema>;

export const employeSchema = z.object({
  id: uuidSchema,
  numero: z.number().int().min(1),
  nom: z.string().min(1),
  postnom: z.string().default(''),
  prenom: z.string().default(''),
  fonction: z.string().default(''),
  telephone: telephoneSchema.default(''),
  code_banque: z.string(),
  salaire_base: decimalNonNegatifSchema,
  actif: z.union([z.literal(0), z.literal(1)]).default(1),
  version: z.number().int().min(1).default(1),
  mis_a_jour_le: z.string(),
  supprime_le: z.string().nullable().default(null),
});
export type Employe = z.infer<typeof employeSchema>;

export const statutOperationSchema = z.enum(['ouverte', 'terminee']);
export type StatutOperation = z.infer<typeof statutOperationSchema>;

export const operationPaieSchema = z.object({
  id: uuidSchema,
  annee: z.number().int().min(2000).max(2100),
  mois: z.number().int().min(1).max(12),
  jours_ouvrables: z.number().int().min(1),
  statut: statutOperationSchema.default('ouverte'),
  terminee_le: z.string().nullable().default(null),
  version: z.number().int().min(1).default(1),
  mis_a_jour_le: z.string(),
  supprime_le: z.string().nullable().default(null),
});
export type OperationPaie = z.infer<typeof operationPaieSchema>;

export const lignePaieSchema = z.object({
  id: uuidSchema,
  operation_id: uuidSchema,
  employe_id: uuidSchema,
  numero: z.number().int().min(1),
  nom: z.string().min(1),
  postnom: z.string().default(''),
  prenom: z.string().default(''),
  fonction: z.string().default(''),
  telephone: telephoneSchema.default(''),
  code_banque: z.string(),
  salaire_base: decimalNonNegatifSchema,
  hs: decimalNonNegatifSchema.default('0'),
  retrait: decimalNonNegatifSchema.default('0'),
  jours_ouvrables: z.number().int().min(1),
  jours_maladie: decimalNonNegatifSchema.default('0'),
  jours_conge: decimalNonNegatifSchema.default('0'),
  jours_absence: decimalNonNegatifSchema.default('0'),
  salaire_a_payer: decimalSigneSchema.nullable().default(null),
  jours_prestes: decimalSigneSchema.nullable().default(null),
  retenue_maladie: decimalNonNegatifSchema.nullable().default(null),
  retenue_conge: decimalNonNegatifSchema.nullable().default(null),
  retenue_absence: decimalNonNegatifSchema.nullable().default(null),
  net_global: decimalSigneSchema.nullable().default(null),
  virement: decimalNonNegatifSchema.nullable().default(null),
  version: z.number().int().min(1).default(1),
  mis_a_jour_le: z.string(),
  supprime_le: z.string().nullable().default(null),
});
export type LignePaie = z.infer<typeof lignePaieSchema>;

/**
 * Ligne de paie enrichie des montants calculés (soit stockés si terminée, soit calculés dynamiquement si ouverte).
 */
export const lignePaieCalculeeSchema = lignePaieSchema.extend({
  salaire_a_payer: decimalSigneSchema,
  jours_prestes: decimalSigneSchema,
  retenue_maladie: decimalNonNegatifSchema,
  retenue_conge: decimalNonNegatifSchema,
  retenue_absence: decimalNonNegatifSchema,
  net_global: decimalSigneSchema,
  virement: decimalNonNegatifSchema,
  avertissement_net_negatif: z.boolean().default(false),
  erreur: z.string().nullable().default(null),
});
export type LignePaieCalculee = z.infer<typeof lignePaieCalculeeSchema>;

export const journalSchema = z.object({
  id: uuidSchema,
  horodatage: z.string(),
  action: z.string().min(1),
  entite: z.string().min(1),
  entite_id: z.string().default(''),
  detail: z.string().default(''),
});
export type Journal = z.infer<typeof journalSchema>;

export const totauxOperationSchema = z.object({
  total_virement: decimalNonNegatifSchema,
  total_net_global: decimalSigneSchema,
  ecart_arrondi: decimalSigneSchema,
  nombre_employes: z.number().int().min(0),
  nombre_lignes_erreur: z.number().int().min(0),
  nombre_sans_telephone: z.number().int().min(0),
  nombre_sans_code_banque: z.number().int().min(0),
  nombre_telephones_en_double: z.number().int().min(0),
});
export type TotauxOperation = z.infer<typeof totauxOperationSchema>;

// ============================================================================
// Enveloppe de Réponse IPC Unifiée
// ============================================================================

export const erreurMetierSchema = z.object({
  code: z.string(),
  message: z.string(),
});
export type ErreurMetierContract = z.infer<typeof erreurMetierSchema>;

export type ReponseIpc<T> = { ok: true; data: T } | { ok: false; erreur: ErreurMetierContract };

// ============================================================================
// Schémas des Canaux IPC
// ============================================================================

export const ipcEmployesListerInput = z
  .object({
    inclureInactifs: z.boolean().optional().default(false),
  })
  .optional()
  .default({ inclureInactifs: false });

export const ipcEmployesCreerInput = z.object({
  numero: z.number().int().min(1).optional(),
  nom: z.string().min(1, 'Le nom est obligatoire.'),
  postnom: z.string().default(''),
  prenom: z.string().default(''),
  fonction: z.string().default(''),
  telephone: telephoneSchema.optional().default(''),
  code_banque: z.string().optional(),
  salaire_base: decimalNonNegatifSchema,
});

export const ipcEmployesModifierInput = z.object({
  id: uuidSchema,
  numero: z.number().int().min(1).optional(),
  nom: z.string().min(1).optional(),
  postnom: z.string().optional(),
  prenom: z.string().optional(),
  fonction: z.string().optional(),
  telephone: telephoneSchema.optional(),
  code_banque: z.string().optional(),
  salaire_base: decimalNonNegatifSchema.optional(),
  actif: z.union([z.literal(0), z.literal(1)]).optional(),
});

export const ipcEmployesDesactiverInput = z.object({
  id: uuidSchema,
});

export const ipcOperationsOuvrirInput = z.object({
  annee: z.number().int().min(2000).max(2100),
  mois: z.number().int().min(1).max(12),
  jours_ouvrables: z.number().int().min(1).optional(),
});

export const ipcOperationsObtenirInput = z.object({
  id: uuidSchema,
});

export const ipcOperationsTerminerInput = z.object({
  id: uuidSchema,
});

export const ipcOperationsRouvrirInput = z.object({
  id: uuidSchema,
});

export const ipcOperationsAjouterNouveauxEmployesInput = z.object({
  id: uuidSchema,
});

export const ipcOperationsExporterBordereauInput = z.object({
  operation_id: uuidSchema,
  format: z.enum(['pdf', 'csv']),
  chemin_destination: z.string().optional(),
});
export type IpcOperationsExporterBordereauInput = z.infer<
  typeof ipcOperationsExporterBordereauInput
>;

export const ipcLignesModifierInput = z.object({
  ligne_id: uuidSchema,
  hs: decimalNonNegatifSchema.optional(),
  retrait: decimalNonNegatifSchema.optional(),
  jours_ouvrables: z.number().int().min(1).optional(),
  jours_maladie: decimalNonNegatifSchema.optional(),
  jours_conge: decimalNonNegatifSchema.optional(),
  jours_absence: decimalNonNegatifSchema.optional(),
});

export const ipcParametresModifierInput = z.object({
  jours_ouvrables_defaut: z.number().int().min(1).optional(),
  diviseur_retenue: z.number().int().min(1).optional(),
  unite_arrondi: z.number().int().min(1).optional(),
  code_banque_defaut: z.string().min(1).optional(),
});

export const ipcJournalListerInput = z
  .object({
    limite: z.number().int().min(1).max(500).optional().default(100),
    entite: z.string().optional(),
  })
  .optional()
  .default({ limite: 100 });

// ============================================================================
// Constantes des Canaux IPC
// ============================================================================

export * from './canaux';

// ============================================================================
// Schémas de Sortie IPC
// ============================================================================

export const resumeOperationListerSchema = operationPaieSchema.extend({
  total_virement: decimalNonNegatifSchema,
  nombre_employes: z.number().int().min(0),
});
export type ResumeOperationLister = z.infer<typeof resumeOperationListerSchema>;

export const detailOperationCompletSchema = z.object({
  operation: operationPaieSchema,
  lignes: z.array(lignePaieCalculeeSchema),
  totaux: totauxOperationSchema,
  parametres: parametreSchema,
});
export type DetailOperationComplet = z.infer<typeof detailOperationCompletSchema>;

export const resultatModificationLigneSchema = z.object({
  ligne: lignePaieCalculeeSchema,
  totaux: totauxOperationSchema,
});
export type ResultatModificationLigne = z.infer<typeof resultatModificationLigneSchema>;

export const resultatAjoutEmployesSchema = z.object({
  ajoutes: z.number().int().min(0),
});
export type ResultatAjoutEmployes = z.infer<typeof resultatAjoutEmployesSchema>;

export const resultatExportBordereauSchema = z.object({
  chemin_fichier: z.string(),
  nom_fichier: z.string(),
  format: z.enum(['pdf', 'csv']),
  nombre_lignes: z.number().int().min(0),
  total_virement: decimalNonNegatifSchema,
  annule: z.boolean().default(false),
});
export type ResultatExportBordereau = z.infer<typeof resultatExportBordereauSchema>;

export const ipcEmployesListerOutput = z.array(employeSchema);
export const ipcEmployesCreerOutput = employeSchema;
export const ipcEmployesModifierOutput = employeSchema;
export const ipcEmployesDesactiverOutput = employeSchema;
export const ipcOperationsListerOutput = z.array(resumeOperationListerSchema);
export const ipcOperationsOuvrirOutput = operationPaieSchema;
export const ipcOperationsObtenirOutput = detailOperationCompletSchema;
export const ipcOperationsTerminerOutput = operationPaieSchema;
export const ipcOperationsRouvrirOutput = operationPaieSchema;
export const ipcOperationsAjouterNouveauxEmployesOutput = resultatAjoutEmployesSchema;
export const ipcOperationsExporterBordereauOutput = resultatExportBordereauSchema;
export const ipcLignesModifierOutput = resultatModificationLigneSchema;
export const ipcParametresLireOutput = parametreSchema;
export const ipcParametresModifierOutput = parametreSchema;
export const ipcJournalListerOutput = z.array(journalSchema);

// ============================================================================
// Interface Typée de l'API Preload (window.api)
// ============================================================================

export interface ElectronApi {
  env: {
    estDev: boolean;
  };
  pingDb?: () => Promise<{ success: boolean; sqlite_version: string }>;
  employes: {
    lister: (input?: z.infer<typeof ipcEmployesListerInput>) => Promise<ReponseIpc<Employe[]>>;
    creer: (input: z.infer<typeof ipcEmployesCreerInput>) => Promise<ReponseIpc<Employe>>;
    modifier: (input: z.infer<typeof ipcEmployesModifierInput>) => Promise<ReponseIpc<Employe>>;
    desactiver: (input: z.infer<typeof ipcEmployesDesactiverInput>) => Promise<ReponseIpc<Employe>>;
  };
  operations: {
    lister: () => Promise<ReponseIpc<ResumeOperationLister[]>>;
    ouvrir: (input: z.infer<typeof ipcOperationsOuvrirInput>) => Promise<ReponseIpc<OperationPaie>>;
    obtenir: (
      input: z.infer<typeof ipcOperationsObtenirInput>
    ) => Promise<ReponseIpc<DetailOperationComplet>>;
    terminer: (
      input: z.infer<typeof ipcOperationsTerminerInput>
    ) => Promise<ReponseIpc<OperationPaie>>;
    rouvrir: (
      input: z.infer<typeof ipcOperationsRouvrirInput>
    ) => Promise<ReponseIpc<OperationPaie>>;
    ajouterNouveauxEmployes: (
      input: z.infer<typeof ipcOperationsAjouterNouveauxEmployesInput>
    ) => Promise<ReponseIpc<ResultatAjoutEmployes>>;
    exporterBordereau: (
      input: z.infer<typeof ipcOperationsExporterBordereauInput>
    ) => Promise<ReponseIpc<ResultatExportBordereau>>;
  };
  lignes: {
    modifier: (
      input: z.infer<typeof ipcLignesModifierInput>
    ) => Promise<ReponseIpc<ResultatModificationLigne>>;
  };
  parametres: {
    lire: () => Promise<ReponseIpc<Parametre>>;
    modifier: (input: z.infer<typeof ipcParametresModifierInput>) => Promise<ReponseIpc<Parametre>>;
  };
  journal: {
    lister: (input?: z.infer<typeof ipcJournalListerInput>) => Promise<ReponseIpc<Journal[]>>;
  };
}
