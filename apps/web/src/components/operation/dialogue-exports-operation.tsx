'use client';

import * as React from 'react';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { api, estDansElectron } from '@/lib/api';
import {
  FileSpreadsheet,
  FileText,
  Download,
  Building2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

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

  const exporterBordereau = async (format: 'pdf' | 'xlsx' | 'csv') => {
    setEnCours(`bordereau-${format}`);
    setMessage(null);
    try {
      if (!estDansElectron()) {
        setMessage({
          type: 'erreur',
          texte: 'Exportation disponible uniquement dans l application desktop.',
        });
        return;
      }
      const res = await api.exports.bordereau({ operationId, format });
      if (res.annule) {
        setMessage({ type: 'info', texte: 'Exportation annulée.' });
      } else {
        setMessage({
          type: 'succes',
          texte: `Bordereau exporté avec succès (${res.nom_fichier}).`,
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

  const exporterOperation = async (format: 'xlsx' | 'csv') => {
    setEnCours(`operation-${format}`);
    setMessage(null);
    try {
      if (!estDansElectron()) {
        setMessage({
          type: 'erreur',
          texte: 'Exportation disponible uniquement dans l application desktop.',
        });
        return;
      }
      const res = await api.exports.operation({ operationId, format });
      setMessage({ type: 'succes', texte: `État de paie exporté (${res.nomFichier}).` });
    } catch (err: any) {
      setMessage({
        type: 'erreur',
        texte: `Échec de l export de l état de paie : ${err?.message || err}`,
      });
    } finally {
      setEnCours(null);
    }
  };

  const exporterRecapitulatif = async (format: 'xlsx' | 'csv') => {
    setEnCours(`recap-${format}`);
    setMessage(null);
    try {
      if (!estDansElectron()) {
        setMessage({
          type: 'erreur',
          texte: 'Exportation disponible uniquement dans l application desktop.',
        });
        return;
      }
      const res = await api.exports.recapitulatif({ operationId, format });
      setMessage({ type: 'succes', texte: `Récapitulatif exporté (${res.nomFichier}).` });
    } catch (err: any) {
      setMessage({
        type: 'erreur',
        texte: `Échec de l export du récapitulatif : ${err?.message || err}`,
      });
    } finally {
      setEnCours(null);
    }
  };

  const exporterBulletins = async () => {
    setEnCours('bulletins');
    setMessage(null);
    try {
      if (!estDansElectron()) {
        setMessage({
          type: 'erreur',
          texte: 'Exportation disponible uniquement dans l application desktop.',
        });
        return;
      }
      const res = await api.exports.bulletin({ operationId, format: 'html' });
      setMessage({ type: 'succes', texte: `Bulletins collectifs exportés (${res.nomFichier}).` });
    } catch (err: any) {
      setMessage({
        type: 'erreur',
        texte: `Échec de l export des bulletins : ${err?.message || err}`,
      });
    } finally {
      setEnCours(null);
    }
  };

  return (
    <Dialog open={ouvert} onOpenChange={onOpenChange} width="max-w-[42rem]">
      <div>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-[0.571rem] text-[1.286rem]">
            <Download className="w-[1.286rem] h-[1.286rem]" />
            <span>
              Exports des documents — Paie {mois}/{annee}
            </span>
          </DialogTitle>
          <p className="text-[0.857rem] text-[var(--text-2)] mt-1">
            Choisissez le document à exporter pour l administration, l impression ou la banque.
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
          {/* 1. Bordereau bancaire */}
          <div className="p-[1rem] rounded-[0.571rem] border border-[var(--border)] bg-[var(--page)] flex items-start justify-between gap-[1rem]">
            <div>
              <div className="flex items-center gap-[0.429rem] font-semibold text-[0.929rem] text-[var(--text)]">
                <Building2 className="w-[1rem] h-[1rem] text-[var(--primary)]" />
                <span>Bordereau de virement bancaire (Pepele Mobile)</span>
              </div>
              <p className="text-[0.786rem] text-[var(--text-2)] mt-[0.286rem]">
                Format 7 colonnes (N°, Nom, Postnom, Prénom, Téléphone, Code banque, Virement) +
                Total à provisionner.
              </p>
            </div>
            <div className="flex items-center gap-[0.429rem] shrink-0">
              <Button
                size="sm"
                variant="outline"
                disabled={enCours !== null}
                onClick={() => exporterBordereau('pdf')}
                className="text-[0.786rem]"
              >
                PDF
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={enCours !== null}
                onClick={() => exporterBordereau('xlsx')}
                className="text-[0.786rem]"
              >
                Excel
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={enCours !== null}
                onClick={() => exporterBordereau('csv')}
                className="text-[0.786rem]"
              >
                CSV
              </Button>
            </div>
          </div>

          {/* 2. État complet de paie mensuelle */}
          <div className="p-[1rem] rounded-[0.571rem] border border-[var(--border)] bg-[var(--page)] flex items-start justify-between gap-[1rem]">
            <div>
              <div className="flex items-center gap-[0.429rem] font-semibold text-[0.929rem] text-[var(--text)]">
                <FileSpreadsheet className="w-[1rem] h-[1rem] text-[var(--primary)]" />
                <span>État complet de la paie mensuelle</span>
              </div>
              <p className="text-[0.786rem] text-[var(--text-2)] mt-[0.286rem]">
                Registre conforme à l onglet Paie Mensuelle avec toutes les rubriques, retenues et
                totaux.
              </p>
            </div>
            <div className="flex items-center gap-[0.429rem] shrink-0">
              <Button
                size="sm"
                variant="outline"
                disabled={enCours !== null}
                onClick={() => exporterOperation('xlsx')}
                className="text-[0.786rem]"
              >
                Excel
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={enCours !== null}
                onClick={() => exporterOperation('csv')}
                className="text-[0.786rem]"
              >
                CSV
              </Button>
            </div>
          </div>

          {/* 3. Synthèse Récapitulatif & Contrôle */}
          <div className="p-[1rem] rounded-[0.571rem] border border-[var(--border)] bg-[var(--page)] flex items-start justify-between gap-[1rem]">
            <div>
              <div className="flex items-center gap-[0.429rem] font-semibold text-[0.929rem] text-[var(--text)]">
                <FileText className="w-[1rem] h-[1rem] text-[var(--primary)]" />
                <span>Synthèse Récapitulatif & Contrôle</span>
              </div>
              <p className="text-[0.786rem] text-[var(--text-2)] mt-[0.286rem]">
                Totaux des rubriques, masse salariale, total viré et écart d arrondi corrigé.
              </p>
            </div>
            <div className="flex items-center gap-[0.429rem] shrink-0">
              <Button
                size="sm"
                variant="outline"
                disabled={enCours !== null}
                onClick={() => exporterRecapitulatif('xlsx')}
                className="text-[0.786rem]"
              >
                Excel
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={enCours !== null}
                onClick={() => exporterRecapitulatif('csv')}
                className="text-[0.786rem]"
              >
                CSV
              </Button>
            </div>
          </div>

          {/* 4. Bulletins de paie collectifs */}
          <div className="p-[1rem] rounded-[0.571rem] border border-[var(--border)] bg-[var(--page)] flex items-start justify-between gap-[1rem]">
            <div>
              <div className="flex items-center gap-[0.429rem] font-semibold text-[0.929rem] text-[var(--text)]">
                <FileText className="w-[1rem] h-[1rem] text-[var(--primary)]" />
                <span>Bulletins de paie collectifs (A4 officiel)</span>
              </div>
              <p className="text-[0.786rem] text-[var(--text-2)] mt-[0.286rem]">
                Fiches individuelles prêtes pour impression A4 ou sauvegarde PDF avec signatures.
              </p>
            </div>
            <div className="flex items-center gap-[0.429rem] shrink-0">
              <Button
                size="sm"
                variant="outline"
                disabled={enCours !== null}
                onClick={exporterBulletins}
                className="text-[0.786rem]"
              >
                HTML / Impression
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
