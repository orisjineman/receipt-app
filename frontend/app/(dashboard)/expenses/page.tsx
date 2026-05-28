export default function ExpensesPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">지출 내역</h1>
      <p className="mt-2 text-slate-600">기간/카테고리별 지출을 확인합니다.</p>

      {/* TODO: GET /api/expenses, /api/expenses/summary 호출 후 차트(recharts) */}
    </div>
  );
}
