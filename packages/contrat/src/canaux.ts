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
  LIGNES_MODIFIER: 'lignes.modifier',
  PARAMETRES_LIRE: 'parametres.lire',
  PARAMETRES_MODIFIER: 'parametres.modifier',
  JOURNAL_LISTER: 'journal.lister',
} as const;

export type CanauxIpc = typeof CANAUX_IPC;
export type NomCanalIpc = (typeof CANAUX_IPC)[keyof typeof CANAUX_IPC];
