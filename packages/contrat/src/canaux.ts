// Constantes des Canaux IPC (aucune dépendance externe pour compatibilité preload Electron sandbox)
export const CANAUX_IPC = {
  EMPLOYES_LISTER: 'employes.lister',
  EMPLOYES_CREER: 'employes.creer',
  EMPLOYES_MODIFIER: 'employes.modifier',
  EMPLOYES_DESACTIVER: 'employes.desactiver',
  OPERATIONS_LISTER: 'operations.lister',
  OPERATIONS_OUVRIR: 'operations.ouvrir',
  OPERATIONS_OBTENIR: 'operations.obtenir',
  OPERATIONS_TERMINER: 'operations.terminer',
  OPERATIONS_ROUVRIR: 'operations.rouvrir',
  OPERATIONS_AJOUTER_NOUVEAUX_EMPLOYES: 'operations.ajouterNouveauxEmployes',
  OPERATIONS_MODIFIER_JOURS: 'operations.modifierJours',
  OPERATIONS_EXPORTER_BORDEREAU: 'operations.exporterBordereau',
  LIGNES_MODIFIER: 'lignes.modifier',
  PARAMETRES_LIRE: 'parametres.lire',
  PARAMETRES_MODIFIER: 'parametres.modifier',
  JOURNAL_LISTER: 'journal.lister',
  // Canaux FENETRE (Section 4.6)
  FENETRE_LIRE_PREFERENCES: 'fenetre.lirePreferences',
  FENETRE_DEFINIR_THEME: 'fenetre.definirTheme',
  FENETRE_DEFINIR_ZOOM: 'fenetre.definirZoom',
  FENETRE_DEFINIR_TAILLE_TEXTE: 'fenetre.definirTailleTexte',
  FENETRE_REDUIRE: 'fenetre.reduire',
  FENETRE_BASCULER_AGRANDISSEMENT: 'fenetre.basculerAgrandissement',
  FENETRE_FERMER: 'fenetre.fermer',
  FENETRE_REDEMARRER: 'fenetre.redemarrer',
} as const;

export type CanauxIpc = typeof CANAUX_IPC;
export type NomCanalIpc = (typeof CANAUX_IPC)[keyof typeof CANAUX_IPC];
