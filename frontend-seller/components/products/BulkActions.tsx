'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';

interface BulkActionsProps {
  selectedCount: number;
  onBulkActivate: () => void;
  onBulkDeactivate: () => void;
  onBulkDelete: () => void;
  onBulkEdit?: () => void;
  processing?: boolean;
}

export default function BulkActions({
  selectedCount,
  onBulkActivate,
  onBulkDeactivate,
  onBulkDelete,
  onBulkEdit,
  processing = false,
}: BulkActionsProps) {
  const [showMenu, setShowMenu] = useState(false);

  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="bg-[#0066CC] text-white rounded-lg p-4 mb-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="font-semibold">
          {selectedCount} product{selectedCount !== 1 ? 's' : ''} selected
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onBulkActivate}
          disabled={processing}
          className="bg-white text-[#0066CC] hover:bg-gray-100 border-white"
        >
          Activate
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onBulkDeactivate}
          disabled={processing}
          className="bg-white text-[#0066CC] hover:bg-gray-100 border-white"
        >
          Deactivate
        </Button>
        {onBulkEdit && (
          <Button
            variant="outline"
            size="sm"
            onClick={onBulkEdit}
            disabled={processing}
            className="bg-white text-[#0066CC] hover:bg-gray-100 border-white"
          >
            Edit
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onBulkDelete}
          disabled={processing}
          className="bg-red-500 text-white hover:bg-red-600 border-red-500"
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
