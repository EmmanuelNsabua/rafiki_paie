<?php

namespace Tests\Feature;

use App\Exceptions\CalculException;
use App\Services\CalculService;
use Tests\TestCase;

class CalculTest extends TestCase
{
    private function loadVecteurs(): array
    {
        $path = base_path('../../packages/calcul/vecteurs/vecteurs.json');
        $this->assertFileExists($path, "Le fichier de vecteurs partagé n'a pas été trouvé à: {$path}");
        $content = file_get_contents($path);
        return json_decode($content, true);
    }

    public function test_cas_complet_reference(): void
    {
        $vecteurs = $this->loadVecteurs();
        $complet = $vecteurs['complet'];
        $input = $complet['input'];
        $expected = $complet['expected'];

        $res = CalculService::calculerLignePaie($input);

        $this->assertEquals($expected['salaire_a_payer'], $res['salaire_a_payer_display']);
        $this->assertEquals($expected['jours_prestes'], $res['jours_prestes']);
        $this->assertEquals($expected['retenue_maladie_display'], $res['retenue_maladie_display']);
        $this->assertEquals($expected['retenue_conge_display'], $res['retenue_conge_display']);
        $this->assertEquals($expected['retenue_absence_display'], $res['retenue_absence_display']);
        $this->assertEquals($expected['global_display'], $res['global_display']);
        $this->assertEquals($expected['virement'], $res['virement']);
    }

    public function test_cas_arrondi(): void
    {
        $vecteurs = $this->loadVecteurs();
        foreach ($vecteurs['arrondi'] as $item) {
            $virement = CalculService::arrondirVirement($item['salaire'], 10);
            $this->assertEquals($item['expected_virement'], $virement);
        }
    }

    public function test_cas_erreurs(): void
    {
        $vecteurs = $this->loadVecteurs();
        foreach ($vecteurs['erreurs'] as $item) {
            try {
                CalculService::calculerLignePaie($item['input']);
                $this->fail("L'exception CalculException aurait dû être levée pour: " . $item['description']);
            } catch (CalculException $e) {
                $this->assertEquals($item['expected_error'], $e->getErrorCode());
            }
        }
    }
}
