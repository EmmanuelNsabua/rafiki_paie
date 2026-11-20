import type { ElectronApi } from '@rafiki/contrat';

declare global {
  interface Window {
    api?: ElectronApi;
  }
}

export {};
