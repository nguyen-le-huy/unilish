/* ──────────────────────────────────────────────────────────────
 * PublishValidation — Pre-publish validation display
 * Stub: Phase 3 will implement full validation UI.
 * ────────────────────────────────────────────────────────────── */

import type { PublishValidationResult } from '../../types';

interface PublishValidationProps {
  result: PublishValidationResult | null;
  isLoading: boolean;
}

const PublishValidation = ({ result, isLoading }: PublishValidationProps) => {
  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">Đang kiểm tra…</div>;
  }

  if (!result) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        Nhấn "Kiểm tra" để xem kết quả validation
      </div>
    );
  }

  return (
    <div className={`rounded-lg border p-4 ${result.valid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
      <p className={`text-sm font-semibold ${result.valid ? 'text-green-700' : 'text-red-700'}`}>
        {result.valid ? '✓ Hợp lệ, có thể publish' : '✗ Còn lỗi cần sửa'}
      </p>
      {result.errors.length > 0 && (
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-red-600">
          {result.errors.map((err, i) => (
            <li key={i}>
              <span className="font-mono text-xs">{err.path}</span>: {err.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PublishValidation;
