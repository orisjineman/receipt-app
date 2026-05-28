export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">대시보드</h1>
      <p className="mt-2 text-slate-600">
        이번 달 지출 요약과 최근 영수증이 여기에 표시됩니다.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <div className="text-sm text-slate-500">이번 달 지출</div>
          <div className="mt-2 text-2xl font-bold">-</div>
        </div>
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <div className="text-sm text-slate-500">영수증 수</div>
          <div className="mt-2 text-2xl font-bold">-</div>
        </div>
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <div className="text-sm text-slate-500">가장 많은 카테고리</div>
          <div className="mt-2 text-2xl font-bold">-</div>
        </div>
      </div>
    </div>
  );
}
