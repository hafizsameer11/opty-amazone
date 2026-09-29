<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\Admin\AdminActivityLogger;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

/**
 * Changes the platform admin login credentials in place, keeping the same
 * user id so admin activity logs and every existing relation stay attached.
 *
 * AdminSeeder only ever creates (firstOrCreate), so it cannot be used to
 * rotate the credentials of an admin that already exists. This command is
 * the supported way to do that on a live database.
 *
 * Production usage (password is prompted, never stored or logged):
 *
 *   php artisan admin:set-credentials
 *   php artisan admin:set-credentials --email=admin@example.com --name="Site Admin"
 *
 * With ADMIN_EMAIL / ADMIN_PASSWORD set in .env, no arguments are needed:
 *
 *   php artisan admin:set-credentials
 *
 * A pipe may be used for non-interactive automation. The value is read from
 * standard input only, is never echoed, and is not written to shell history:
 *
 *   printf '%s' "$NEW_PASSWORD" | php artisan admin:set-credentials
 *
 * Every run revokes all Sanctum tokens for the account, so any browser
 * session signed in with the previous credentials is logged out immediately.
 */
class SetAdminCredentials extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'admin:set-credentials
                            {--email= : New admin email address (defaults to ADMIN_EMAIL)}
                            {--name= : New admin display name (defaults to ADMIN_NAME)}
                            {--password= : New password. Prefer the interactive prompt, or pipe the value on stdin.}
                            {--user= : Change this admin by id instead of the current ADMIN_EMAIL}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Update the admin login email and password in place, preserving the user id and revoking existing sessions';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $email = $this->resolveEmail();
        if ($email === null) {
            return self::FAILURE;
        }

        $admin = $this->resolveAdmin();
        if ($admin === null) {
            return self::FAILURE;
        }

        $password = $this->resolvePassword();
        if ($password === null) {
            $this->error('No password supplied. Nothing was changed.');

            return self::FAILURE;
        }

        $name = $this->resolveName($admin);

        try {
            $this->assertUsable($email, $password, $name, $admin);
        } catch (ValidationException $e) {
            foreach ($e->errors() as $field => $messages) {
                foreach ($messages as $message) {
                    $this->error($message);
                }
            }
            $this->error('Nothing was changed.');

            return self::FAILURE;
        }

        $previousEmail = $admin->email;

        $admin->forceFill([
            'email' => $email,
            'name' => $name,
            'password' => Hash::make($password),
            'role' => 'admin',
            'email_verified_at' => $admin->email_verified_at ?? now(),
            'is_blocked' => false,
        ])->save();

        // Any session started with the previous credentials must stop working
        // the moment the password changes. AuthService::login already clears
        // tokens on every login, so this only closes the open sessions.
        $revoked = $admin->tokens()->delete();

        AdminActivityLogger::log(
            $admin,
            'admin.credentials_updated',
            User::class,
            $admin->id,
            true,
            [
                'previous_email' => $previousEmail,
                'email_changed' => $previousEmail !== $email,
                'sessions_revoked' => $revoked,
            ],
        );

        $this->info('Admin credentials updated.');
        $this->table(
            ['Field', 'Value'],
            [
                ['User ID', $admin->id],
                ['Previous email', $previousEmail],
                ['New email', $email],
                ['Name', $name],
                ['Role', 'admin'],
                ['Blocked', 'no'],
                ['Sessions revoked', (string) $revoked],
            ],
        );
        $this->newLine();
        $this->line('Sign in at POST /api/admin/auth/login with the new email and password.');

        return self::SUCCESS;
    }

    /**
     * Resolve and validate the target email address.
     *
     * The address is stored exactly as supplied. AuthService::login matches
     * with `where('email', $email)`, which is case-sensitive on SQLite and
     * PostgreSQL, so lowercasing here would make the address the operator
     * types at the admin login screen fail to match the stored row.
     */
    private function resolveEmail(): ?string
    {
        $email = trim((string) ($this->option('email') ?: env('ADMIN_EMAIL', '')));

        if ($email === '') {
            $this->error('No email supplied. Pass --email= or set ADMIN_EMAIL in .env.');

            return null;
        }

        $validator = Validator::make(['email' => $email], [
            'email' => ['required', 'email:rfc', 'max:255'],
        ]);

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $message) {
                $this->error($message);
            }

            return null;
        }

        return $email;
    }

    /**
     * Resolve the admin account to update.
     *
     * Resolution order: --user id, then a row already using the requested
     * email, then the current ADMIN_EMAIL row, then the oldest admin. This
     * keeps the command working whether the account is being renamed or its
     * password is only being rotated.
     */
    private function resolveAdmin(): ?User
    {
        if ($id = $this->option('user')) {
            $admin = User::withTrashed()->find($id);
            if (! $admin) {
                $this->error("No user found with ID {$id}.");

                return null;
            }

            return $admin;
        }

        $email = trim((string) ($this->option('email') ?: env('ADMIN_EMAIL', '')));

        $candidates = User::withTrashed()->where('role', 'admin')->orderBy('id')->get();

        if ($candidates->isEmpty()) {
            $this->error('No admin account exists. Run: php artisan db:seed --class="Database\Seeders\AdminSeeder" --force');

            return null;
        }

        $admin = $email !== '' ? $candidates->firstWhere('email', $email) : null;
        $admin ??= $candidates->first();
        if ($candidates->count() > 1) {
            $this->warn("{$candidates->count()} admin accounts exist; updating the one with the lowest id. Use --user=<id> to target another.");
        }

        return $admin;
    }

    /**
     * Resolve the password from --password, then ADMIN_PASSWORD, then stdin,
     * then an interactive hidden prompt.
     */
    private function resolvePassword(): ?string
    {
        $password = (string) ($this->option('password') ?: '');

        if ($password === '') {
            $password = (string) env('ADMIN_PASSWORD', '');
        }

        // A piped value is only read when nothing else supplied one, so an
        // interactive run never blocks waiting on a terminal that is already
        // holding the value.
        if ($password === '' && $this->hasPipedInput()) {
            $password = trim((string) stream_get_contents(STDIN));
        }

        if ($password === '' && $this->input->isInteractive()) {
            $password = (string) $this->secret('New admin password');
        }

        return $password !== '' ? $password : null;
    }

    /**
     * Detect a piped password without blocking on an interactive terminal.
     */
    private function hasPipedInput(): bool
    {
        if (! defined('STDIN')) {
            return false;
        }

        $read = [STDIN];
        $write = null;
        $except = null;

        return @stream_select($read, $write, $except, 0, 350000) > 0;
    }

    /**
     * Resolve the display name, keeping the existing one when not supplied.
     */
    private function resolveName(User $admin): string
    {
        $name = trim((string) ($this->option('name') ?: env('ADMIN_NAME', '')));

        return $name !== '' ? $name : $admin->name;
    }

    /**
     * Refuse to run against a duplicate email or a too-weak password.
     *
     * @throws ValidationException
     */
    private function assertUsable(string $email, string $password, string $name, User $admin): void
    {
        DB::transaction(function () use ($email, $password, $name, $admin) {
            $validator = Validator::make(
                ['email' => $email, 'password' => $password, 'name' => $name],
                [
                    'email' => ['required', 'email:rfc', 'max:255', 'unique:users,email,'.$admin->id],
                    'password' => ['required', 'string', 'min:8', 'max:72'],
                    'name' => ['required', 'string', 'max:255'],
                ],
            );

            if ($validator->fails()) {
                throw new ValidationException($validator);
            }
        });
    }
}
