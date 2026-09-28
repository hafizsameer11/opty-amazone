<?php

namespace App\Console\Commands;

use App\Models\ApiClient;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Schema;

/**
 * Issues a read-only CRM API key.
 *
 * The plaintext key is printed exactly once and only its SHA-256 hash is
 * stored, so it cannot be recovered later. Paste it into the LEO24 CRM at
 * Project Management -> Projects -> the Vista Express project -> API Key.
 */
class CreateCrmApiClient extends Command
{
    protected $signature = 'crm:client
                            {name=CRM integration : A label so the key can be identified later}
                            {--abilities=* : Scopes to grant, e.g. --abilities=overview --abilities=orders. Omit for all read resources}
                            {--rate-limit= : Requests per minute for this client}
                            {--days= : Number of days before the key expires}';

    protected $description = 'Create a read-only CRM API client key for the LEO24 CRM integration.';

    public function handle(): int
    {
        if (! Schema::hasTable('api_clients')) {
            $this->error('The api_clients table does not exist. Run: php artisan migrate');

            return self::FAILURE;
        }

        $plainKey = ApiClient::generateKey();

        $client = ApiClient::create([
            'name' => (string) $this->argument('name'),
            'key_hash' => ApiClient::hashKey($plainKey),
            'key_prefix' => ApiClient::prefixOf($plainKey),
            'abilities' => $this->abilities(),
            'rate_limit_per_minute' => $this->option('rate-limit') ?: null,
            'expires_at' => $this->option('days')
                ? now()->addDays((int) $this->option('days'))
                : null,
        ]);

        $this->newLine();
        $this->line('  <options=bold>CRM API key created</>');
        $this->newLine();
        $this->line('  Client ID : '.$client->id);
        $this->line('  Name      : '.$client->name);
        $this->line('  Abilities : '.implode(', ', $client->allowedScopes()));
        $this->line('  Expires   : '.($client->expires_at?->toDateString() ?? 'never'));
        $this->newLine();
        $this->line('  <fg=yellow>API KEY (shown once - copy it now):</>');
        $this->line('  '.$plainKey);
        $this->newLine();
        $this->line('  Add this to the CRM project configuration as the API Key.');
        $this->line('  The CRM sends it in the '.(config('crm.key_header', 'X-CRM-API-Key')).' header.');
        $this->newLine();

        return self::SUCCESS;
    }

    /** @return array<int, string> */
    private function abilities(): array
    {
        $abilities = array_values(array_filter((array) $this->option('abilities')));

        return $abilities ?: [];
    }
}
