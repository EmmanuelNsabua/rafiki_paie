import * as React from 'react';

export function Toaster() {
  return null; // Minimal toaster container
}

export const toast = {
  success: (msg: string) => console.log('[Toast Success]:', msg),
  error: (msg: string) => console.error('[Toast Error]:', msg),
  info: (msg: string) => console.log('[Toast Info]:', msg),
};
