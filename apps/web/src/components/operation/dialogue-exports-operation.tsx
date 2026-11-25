'use client';

import * as React from 'react';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { api, estDansElectron } from '@/lib/api';
import { FileSpreadsheet, Download, Building2, CheckCircle2, AlertCircle } from 'lucide-react';

interface DialogueExportsOperationProps {
  ouvert: boolean;
  onOpenChange: (ouvert: boolean) => void;
  operationId: string;
  mois: number;
  annee: number;
  estTerminee: boolean;
}

export function DialogueExportsOperation({
  ouvert,
  onOpenChange,
  operationId,
  mois,
  annee,
}: DialogueExportsOperationProps) {
  const [enCours, setEnCours] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<{
    type: 'succes' | 'erreur' | 'info';
    texte: string;
  } | null>(null);

  const exporterBordereauPdf = async () => {
    setEnCours('bordereau');
    setMessage(null);
    try {
      if (!estDansElectron()) {
        setMessage({
          type: 'erreur',
          texte: 'Exportation disponible uniquement dans l application desktop.',
        });
        return;
      }
      const res = await api.exports.bordereau({ operationId, format: 'pdf' });
      if (res.annule) {
        setMessage({ type: 'info', texte: 'Exportation annulée.' });
      } else {
        setMessage({
          type: 'succes',
          texte: `Bordereau PDF exporté avec succès (${res.nom_fichier}).`,
        });
      }
    } catch (err: any) {
      setMessage({
        type: 'erreur',
        texte: `Échec de l export du bordereau : ${err?.message || err}`,
      });
    } finally {
      setEnCours(null);
    }
  };

  const exporterOperationExcel = async () => {
    setEnCours('operation');
    setMessage(null);
    try {
      if (!estDansElectron()) {
        setMessage({
          type: 'erreur',
          texte: 'Exportation disponible uniquement dans l application desktop.',
        });
        return;
      }
      const res = await api.exports.operation({ operationId, format: 'xlsx' });
      setMessage({ type: 'succes', texte: `État de paie Excel exporté (${res.nomFichier}).` });
    } catch (err: any) {
      setMessage({
        type: 'erreur',
        texte: `Échec de l export de l état de paie : ${err?.message || err}`,
      });
    } finally {
      setEnCours(null);
    }
  };

  return (
    <Dialog open={ouvert} onOpenChange={onOpenChange} width="max-w-[36rem]">
      <div>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-[0.571rem] text-[1.286rem]">
            <Download className="w-[1.286rem] h-[1.286rem]" />
            <span>
              Exports des documents — Paie {mois}/{annee}
            </span>
          </DialogTitle>
          <p className="text-[0.857rem] text-[var(--text-2)] mt-1">
            Choisissez le document à exporter pour l administration ou la banque.
          </p>
        </DialogHeader>

        {message && (
          <div
            className={`my-3 p-3 rounded-[0.429rem] text-xs flex items-center gap-2 ${
              message.type === 'succes'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                : message.type === 'erreur'
                  ? 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
                  : 'bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
            }`}
          >
            {message.type === 'succes' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{message.texte}</span>
          </div>
        )}

        <div className="space-y-[1.143rem] py-[0.571rem]">
          {/* 1. Bordereau bancaire (PDF uniquement) */}
          <div className="p-[1rem] rounded-[0.571rem] border border-[var(--border)] bg-[var(--page)] flex items-center justify-between gap-[1rem]">
            <div>
              <div className="flex items-center gap-[0.429rem] font-semibold text-[0.929rem] text-[var(--text)]">
                <Building2 className="w-[1rem] h-[1rem] text-[var(--primary)]" />
                <span>Bordereau de virement bancaire (Pepele Mobile)</span>
              </div>
              <p className="text-[0.786rem] text-[var(--text-2)] mt-[0.286rem]">
                Format bancaire 7 colonnes + Total à provisionner (PDF).
              </p>
            </div>
            <Button
              size="sm"
              disabled={enCours !== null}
              onClick={exporterBordereauPdf}
              className="text-[0.786rem] flex items-center gap-1.5 shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Télécharger</span>
            </Button>
          </div>

          {/* 2. État complet de paie mensuelle (Excel uniquement) */}
          <div className="p-[1rem] rounded-[0.571rem] border border-[var(--border)] bg-[var(--page)] flex items-center justify-between gap-[1rem]">
            <div>
              <div className="flex items-center gap-[0.429rem] font-semibold text-[0.929rem] text-[var(--text)]">
                <FileSpreadsheet className="w-[1rem] h-[1rem] text-[var(--primary)]" />
                <span>État complet de la paie mensuelle</span>
              </div>
              <p className="text-[0.786rem] text-[var(--text-2)] mt-[0.286rem]">
                Registre complet avec toutes les rubriques, retenues et totaux (Excel).
              </p>
            </div>
            <Button
              size="sm"
              disabled={enCours !== null}
              onClick={exporterOperationExcel}
              className="text-[0.786rem] flex items-center gap-1.5 shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Télécharger</span>
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
