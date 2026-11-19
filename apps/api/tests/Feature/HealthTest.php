<?php

namespace Tests\Feature;

use Tests\TestCase;

class HealthTest extends TestCase
{
    public function test_health_check_returns_ok(): void
    {
        $response = $this->get('/api/health');

        $response->assertStatus(200);
        $response->assertJson(['status' => 'ok']);
    }
}
