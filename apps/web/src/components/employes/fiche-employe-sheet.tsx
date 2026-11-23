'use client';

import * as React from 'react';
import type { Employe, Parametre } from '@rafiki/contrat';
import {
  Sheet,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { normaliserSaisieDecimale } from '@/lib/format';
import { toast } from '@/components/ui/sonner';

export interface FicheEmployeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employe: Employe | null; // null si création
  codeBanqueDefaut?: string;
  onEnregistrer: (donnees: {
    id?: string;
    nom: string;
    postnom: string;
    prenom: string;
    fonction: string;
    telephone: string;
    code_banque: string;
    salaire_base: string;
    actif?: 0 | 1;
  }) => Promise<void>;
}

export function FicheEmployeSheet({
  open,
  onOpenChange,
  employe,
  codeBanqueDefaut = '',
  onEnregistrer,
}: FicheEmployeSheetProps) {
  const [nom, setNom] = React.useState('');
  const [postnom, setPostnom] = React.useState('');
  const [prenom, setPrenom] = React.useState('');
  const [fonction, setFonction] = React.useState('');
  const [telephone, setTelephone] = React.useState('');
  const [codeBanque, setCodeBanque] = React.useState('');
  const [salaireBase, setSalaireBase] = React.useState('');
  const [actif, setActif] = React.useState(true);

  const [erreurNom, setErreurNom] = React.useState<string | null>(null);
  const [erreurSalaire, setErreurSalaire] = React.useState<string | null>(null);
  const [erreurGenerale, setErreurGenerale] = React.useState<string | null>(null);
  const [sauvegardeEnCours, setSauvegardeEnCours] = React.useState(false);

  React.useEffect(() => {
    if (employe) {
      setNom(employe.nom || '');
      setPostnom(employe.postnom || '');
      setPrenom(employe.prenom || '');
      setFonction(employe.fonction || '');
      setTelephone(employe.telephone || '');
      setCodeBanque(employe.code_banque || '');
      setSalaireBase(employe.salaire_base || '');
      setActif(employe.actif === 1);
    } else {
      // Nouvel employé
      setNom('');
      setPostnom('');
      setPrenom('');
      setFonction('');
      setTelephone('');
      setCodeBanque(codeBanqueDefaut || '');
      setSalaireBase('');
      setActif(true);
    }
    setErreurNom(null);
    setErreurSalaire(null);
    setErreurGenerale(null);
  }, [employe, codeBanqueDefaut, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreurNom(null);
    setErreurSalaire(null);
    setErreurGenerale(null);

    const nomTrim = nom.trim();
    if (!nomTrim) {
      setErreurNom('Le nom est obligatoire.');
      return;
    }

    const salaireNorm = normaliserSaisieDecimale(salaireBase);
    if (!salaireNorm || salaireNorm === '0') {
      setErreurSalaire('Le salaire de base doit être supérieur à zéro.');
      return;
    }

    setSauvegardeEnCours(true);
    try {
      await onEnregistrer({
        id: employe?.id,
        nom: nomTrim,
        postnom: postnom.trim(),
        prenom: prenom.trim(),
        fonction: fonction.trim(),
        telephone: telephone.trim(),
        code_banque: codeBanque.trim(),
        salaire_base: salaireNorm,
        actif: actif ? 1 : 0,
      });
      onOpenChange(false);
    } catch (err: any) {
      setErreurGenerale(err?.message || 'Erreur lors de l’enregistrement');
    } finally {
      setSauvegardeEnCours(false);
    }
  };

  const titre = employe
    ? `Modifier l’employé — ${employe.nom} ${employe.postnom || ''}`.trim()
    : 'Nouvel employé';

  return (
    <Sheet open={open} onOpenChange={onOpenChange} width="w-[28.571rem]">
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
        <SheetHeader>
          <SheetTitle className="text-[1.143rem]">{titre}</SheetTitle>
          <SheetDescription className="text-[0.857rem]">
            {employe
              ? 'Mettez à jour les coordonnées et les informations salariales de l’employé.'
              : 'Ajoutez un nouvel employé au registre de l’école.'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-[0.857rem] py-[0.571rem] overflow-y-auto pr-1">
          {erreurGenerale && (
            <div className="p-[0.571rem] rounded-[0.429rem] bg-[var(--danger-tint)] border border-[var(--danger)] text-[var(--danger)] text-[0.857rem]">
              {erreurGenerale}
            </div>
          )}

          {/* Nom */}
          <div className="space-y-[0.286rem]">
            <Label htmlFor="champ-nom" className="text-[0.857rem] font-medium text-[var(--text)]">
              Nom <span className="text-[var(--danger)]">*</span>
            </Label>
            <Input
              id="champ-nom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Ex: KABONGO"
              className="h-[2.286rem] text-[1rem]"
              autoFocus
            />
            {erreurNom && (
              <p className="text-[0.786rem] text-[var(--danger)] font-medium">{erreurNom}</p>
            )}
          </div>

          {/* Postnom et Prénom */}
          <div className="grid grid-cols-2 gap-[0.571rem]">
            <div className="space-y-[0.286rem]">
              <Label
                htmlFor="champ-postnom"
                className="text-[0.857rem] font-medium text-[var(--text)]"
              >
                Postnom
              </Label>
              <Input
                id="champ-postnom"
                value={postnom}
                onChange={(e) => setPostnom(e.target.value)}
                placeholder="Ex: ILUNGA"
                className="h-[2.286rem] text-[1rem]"
              />
            </div>
            <div className="space-y-[0.286rem]">
              <Label
                htmlFor="champ-prenom"
                className="text-[0.857rem] font-medium text-[var(--text)]"
              >
                Prénom
              </Label>
              <Input
                id="champ-prenom"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                placeholder="Ex: Gloire"
                className="h-[2.286rem] text-[1rem]"
              />
            </div>
          </div>

          {/* Fonction */}
          <div className="space-y-[0.286rem]">
            <Label
              htmlFor="champ-fonction"
              className="text-[0.857rem] font-medium text-[var(--text)]"
            >
              Fonction
            </Label>
            <Input
              id="champ-fonction"
              value={fonction}
              onChange={(e) => setFonction(e.target.value)}
              placeholder="Ex: Enseignant 5e primaire"
              className="h-[2.286rem] text-[1rem]"
            />
          </div>

          {/* Téléphone */}
          <div className="space-y-[0.286rem]">
            <Label
              htmlFor="champ-telephone"
              className="text-[0.857rem] font-medium text-[var(--text)]"
            >
              Téléphone
            </Label>
            <Input
              id="champ-telephone"
              type="tel"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              placeholder="Ex: +243 81 000 0001"
              className="h-[2.286rem] text-[1rem]"
            />
          </div>

          {/* Code banque */}
          <div className="space-y-[0.286rem]">
            <Label
              htmlFor="champ-code-banque"
              className="text-[0.857rem] font-medium text-[var(--text)]"
            >
              Code banque
            </Label>
            <Input
              id="champ-code-banque"
              value={codeBanque}
              onChange={(e) => setCodeBanque(e.target.value)}
              placeholder="Ex: 001"
              className="h-[2.286rem] text-[1rem]"
            />
            <p className="text-[0.786rem] text-[var(--text-2)]">
              Identifiant du compte ou code d’imputation bancaire.
            </p>
          </div>

          {/* Salaire de base */}
          <div className="space-y-[0.286rem]">
            <Label
              htmlFor="champ-salaire"
              className="text-[0.857rem] font-medium text-[var(--text)]"
            >
              Salaire de base ($) <span className="text-[var(--danger)]">*</span>
            </Label>
            <Input
              id="champ-salaire"
              inputMode="decimal"
              value={salaireBase}
              onChange={(e) => setSalaireBase(normaliserSaisieDecimale(e.target.value))}
              placeholder="Ex: 500"
              className="h-[2.286rem] text-[1rem] font-mono"
            />
            {erreurSalaire && (
              <p className="text-[0.786rem] text-[var(--danger)] font-medium">{erreurSalaire}</p>
            )}
            <p className="text-[0.786rem] text-[var(--text-2)]">
              Les opérations déjà ouvertes gardent l’ancien salaire.
            </p>
          </div>

          {/* Interrupteur Actif */}
          {employe && (
            <div className="pt-[0.571rem] flex items-center justify-between p-[0.714rem] rounded-[0.429rem] bg-[var(--table-head)] border border-[var(--border)]">
              <div className="space-y-[0.143rem]">
                <Label
                  htmlFor="interrupteur-actif"
                  className="text-[0.857rem] font-medium text-[var(--text)]"
                >
                  Employé actif
                </Label>
                <p className="text-[0.786rem] text-[var(--text-2)]">
                  Les employés inactifs ne sont pas ajoutés aux nouvelles paies.
                </p>
              </div>
              <Switch id="interrupteur-actif" checked={actif} onCheckedChange={setActif} />
            </div>
          )}
        </div>

        <SheetFooter className="mt-[0.857rem] pt-[0.857rem] border-t border-[var(--border)]">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sauvegardeEnCours}
            className="h-[2.429rem] px-[0.857rem] text-[0.929rem] cursor-pointer"
          >
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={sauvegardeEnCours}
            className="h-[2.429rem] px-[1rem] bg-[var(--primary)] hover:bg-[var(--primary-strong)] text-white text-[0.929rem] font-semibold cursor-pointer"
          >
            {sauvegardeEnCours ? 'Enregistrement…' : employe ? 'Enregistrer' : 'Créer l’employé'}
          </Button>
        </SheetFooter>
      </form>
    </Sheet>
  );
}
