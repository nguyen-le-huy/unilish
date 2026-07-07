/* ──────────────────────────────────────────────────────────────
 * TestTable — Admin IELTS practice test table (Phase 3)
 * Stub: Full table with sort/select/bulk actions in Phase 3.
 * Currently fulfilled inline in IeltsPracticeListPage.
 * ────────────────────────────────────────────────────────────── */

import type { AdminTestListItem } from '../../types';

interface TestTableProps {
  tests: AdminTestListItem[];
  onEdit: (id: string) => void;
}

const TestTable = ({ tests, onEdit }: TestTableProps) => {
  if (tests.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Không có đề nào.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-left text-sm">
        <thead className="border-b bg-muted/50">
          <tr>
            <th className="px-4 py-3 font-semibold">Tiêu đề</th>
            <th className="px-4 py-3 font-semibold">Kỹ năng</th>
            <th className="px-4 py-3 font-semibold">Trạng thái</th>
            <th className="px-4 py-3 font-semibold">Phiên bản</th>
            <th className="px-4 py-3 font-semibold">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {tests.map((test) => (
            <tr key={test._id} className="border-b transition-colors hover:bg-muted/30">
              <td className="px-4 py-3 font-medium">{test.name}</td>
              <td className="px-4 py-3">{test.skill}</td>
              <td className="px-4 py-3">{test.status}</td>
              <td className="px-4 py-3">v{test.version}</td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => onEdit(test._id)}
                  className="rounded bg-secondary px-2.5 py-1 text-xs font-medium hover:bg-secondary/80"
                >
                  Sửa
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TestTable;
