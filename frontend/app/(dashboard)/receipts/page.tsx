export default function ReceiptsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">영수증 목록</h1>
      <p className="mt-2 text-slate-600">업로드한 영수증이 여기에 표시됩니다.</p>

      {/* TODO: React Query로 GET /api/receipts 호출 후 카드/테이블로 렌더 */}
    </div>
  );
}
