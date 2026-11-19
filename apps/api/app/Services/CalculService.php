<?php

namespace App\Services;

use App\Exceptions\CalculException;
use Brick\Math\BigDecimal;
use Brick\Math\RoundingMode;

class CalculService
{
    public const DEFAULT_SCALE = 30;

    /**
     * Arrondi à la dizaine la plus proche (la moitié monte)
     */
    public static function arrondirVirement(string|int|float|BigDecimal $montant, int $unite = 10): int
    {
        $d = $montant instanceof BigDecimal ? $montant : BigDecimal::of((string) $montant);
        $u = BigDecimal::of($unite);

        // Half-up division to nearest integer multiple of unite
        return $d->dividedBy($u, 0, RoundingMode::HalfUp)
            ->multipliedBy($u)
            ->toInt();
    }

    /**
     * Calcule une ligne de paie
     *
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     * @throws CalculException
     */
    public static function calculerLignePaie(array $input): array
    {
        $joursOuvrables = (int) ($input['jours_ouvrables'] ?? 0);
        if ($joursOuvrables < 1) {
            throw new CalculException('JOURS_OUVRABLES_INVALID', 'Les jours ouvrables doivent être supérieurs ou égaux à 1.');
        }

        $joursMaladie = (int) ($input['jours_maladie'] ?? 0);
        $joursConge = (int) ($input['jours_conge'] ?? 0);
        $joursAbsence = (int) ($input['jours_absence'] ?? 0);

        if ($joursMaladie + $joursConge + $joursAbsence > $joursOuvrables) {
            throw new CalculException('ABSENCES_DEPASSEE', 'Le total des absences dépasse le nombre de jours ouvrables.');
        }

        $salaire = BigDecimal::of((string) ($input['salaire'] ?? 0));
        $hs = BigDecimal::of((string) ($input['hs'] ?? 0));
        $retrait = BigDecimal::of((string) ($input['retrait'] ?? 0));
        $uniteArrondi = (int) ($input['unite_arrondi'] ?? 10);

        // Fractions par défaut : 1/3 pour maladie et congé
        $fractionMaladie = isset($input['fraction_maladie'])
            ? BigDecimal::of((string) $input['fraction_maladie'])
            : BigDecimal::one()->dividedBy(BigDecimal::of(3), self::DEFAULT_SCALE, RoundingMode::HalfUp);

        $fractionConge = isset($input['fraction_conge'])
            ? BigDecimal::of((string) $input['fraction_conge'])
            : BigDecimal::one()->dividedBy(BigDecimal::of(3), self::DEFAULT_SCALE, RoundingMode::HalfUp);

        // Formules
        // salaire_a_payer = salaire + hs - retrait
        $salaireAPayer = $salaire->plus($hs)->minus($retrait);

        // taux_journalier = salaire / jours_ouvrables
        $tauxJournalier = $salaire->dividedBy(BigDecimal::of($joursOuvrables), self::DEFAULT_SCALE, RoundingMode::HalfUp);

        // Retenues sans arrondis intermédiaires
        $retenueMaladie = $tauxJournalier->multipliedBy($fractionMaladie)->multipliedBy(BigDecimal::of($joursMaladie));
        $retenueConge = $tauxJournalier->multipliedBy($fractionConge)->multipliedBy(BigDecimal::of($joursConge));
        $retenueAbsence = $tauxJournalier->multipliedBy(BigDecimal::of($joursAbsence));

        // global = salaire_a_payer - retenue_maladie - retenue_conge - retenue_absence
        $global = $salaireAPayer->minus($retenueMaladie)->minus($retenueConge)->minus($retenueAbsence);

        if ($global->isNegative()) {
            throw new CalculException('GLOBAL_NEGATIF', 'Le net global est négatif.');
        }

        $joursPrestes = $joursOuvrables - $joursMaladie - $joursConge - $joursAbsence;
        $virement = self::arrondirVirement($global, $uniteArrondi);

        return [
            'salaire_a_payer' => $salaireAPayer,
            'salaire_a_payer_display' => $salaireAPayer->toScale(2, RoundingMode::HalfUp)->__toString(),
            'jours_prestes' => $joursPrestes,
            'retenue_maladie' => $retenueMaladie,
            'retenue_maladie_display' => $retenueMaladie->toScale(2, RoundingMode::HalfUp)->__toString(),
            'retenue_conge' => $retenueConge,
            'retenue_conge_display' => $retenueConge->toScale(2, RoundingMode::HalfUp)->__toString(),
            'retenue_absence' => $retenueAbsence,
            'retenue_absence_display' => $retenueAbsence->toScale(2, RoundingMode::HalfUp)->__toString(),
            'global' => $global,
            'global_display' => $global->toScale(2, RoundingMode::HalfUp)->__toString(),
            'virement' => $virement,
        ];
    }
}
