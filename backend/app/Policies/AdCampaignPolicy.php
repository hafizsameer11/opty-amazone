<?php

namespace App\Policies;

use App\Models\AdCampaign;
use App\Models\User;

class AdCampaignPolicy
{
    public function before(User $u): ?bool
    {
        return $u->is_blocked ? false : null;
    }

    // This application has a single admin role, no admin permission table.
    // Explicit gates ensure a Sanctum token alone never confers admin access.
    public function viewAny(User $u): bool
    {
        return $u->isAdmin() || $u->isSeller();
    }

    public function create(User $u): bool
    {
        return $u->isSeller() && $u->store()->where('status', 'active')->where('is_active', true)->exists();
    }

    public function view(User $u, AdCampaign $c): bool
    {
        return $u->isAdmin() || ($u->isSeller() && $c->seller_id === $u->id);
    }

    public function manage(User $u, AdCampaign $c): bool
    {
        return $u->isSeller() && $c->seller_id === $u->id;
    }

    public function review(User $u): bool
    {
        return $u->isAdmin();
    }

    public function refund(User $u): bool
    {
        return $u->isAdmin();
    }
}
