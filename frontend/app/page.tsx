import { redirect } from "next/navigation";

// 인증은 middleware에서 처리되므로 여기까지 도달했다면 이미 로그인된 상태.
// 루트는 바로 대시보드로 보낸다.
export default function HomePage() {
  redirect("/dashboard");
}
