<?php

namespace App\Observers;

use App\Models\AdjustmentReason;

class AdjustmentReasonObserver extends BaseObserver
{
    protected function getResourceName(): string
    {
        return 'Motivo de Ajuste';
    }
}
