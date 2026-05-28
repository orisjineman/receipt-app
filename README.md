# 영수증 지출 관리

> 영수증 사진을 올리면 Upstage AI가 가맹점·금액·날짜·품목을 자동으로 뽑아 지출 내역으로 정리해주는 **단일 사용자용** 웹 앱.

```
                         사진 한 장 올리면 끝.
   ┌─────────┐     ┌──────────┐     ┌──────────────────────┐     ┌─────────┐
   │ 영수증  │ ──→ │ Vercel   │ ──→ │ Upstage              │ ──→ │ 지출    │
   │ 이미지  │     │ Blob     │     │ Information Extract  │     │ 내역    │
   └─────────┘     └──────────┘     └──────────────────────┘     └─────────┘
                       (원본 보관)        (구조화 JSON)              (Neon Postgres)
```

---

## 기술 스택

| 영역 | 선택 |
| --- | --- |
| 프론트엔드 | Next.js 14 (App Router) · TypeScript · Tailwind CSS |
| 백엔드 | Express · TypeScript · Prisma ORM |
| 데이터베이스 | Neon Postgres (Serverless) |
| 파일 저장 | Vercel Blob |
| 정보 추출 | Upstage Universal Information Extraction |
| 인증 | HTTP Basic Auth (단일 사용자) |
| 배포 | Vercel (frontend / backend 각각 별도 프로젝트) |

---

## 프로젝트 구조

```
receipt/
├── frontend/                     Next.js 14 (App Router)
│   ├── app/
│   │   ├── (dashboard)/          보호된 라우트 (dashboard / receipts / upload / expenses / categories)
│   │   ├── layout.tsx
│   │   ├── page.tsx              루트 → /dashboard 리다이렉트
│   │   └── globals.css
│   ├── lib/                      api 클라이언트, 유틸
│   ├── middleware.ts             Basic Auth 검증
│   └── next.config.js            /backend/* → 백엔드로 rewrites
│
├── backend/                      Express + TypeScript
│   ├── api/index.ts              Vercel Serverless 진입점
│   ├── src/
│   │   ├── app.ts                Express 앱 (CORS / helmet / rate-limit)
│   │   ├── config/env.ts         zod 환경변수 검증
│   │   ├── lib/prisma.ts
│   │   ├── middleware/{basicAuth,error}.ts
│   │   ├── routes/{receipts,expenses,categories}.ts
│   │   └── services/
│   │       ├── blob.ts           Vercel Blob 업/다운로드
│   │       └── upstage.ts        Information Extraction (JSON Schema 기반)
│   ├── prisma/schema.prisma      Receipt / ReceiptItem / Expense / Category
│   └── scripts/
│       └── test-ie.ts            Upstage IE API 단독 테스트
│
└── package.json                  npm workspaces 루트
```

---

## 데이터 흐름

```
사용자 → /upload 에서 파일 선택
       └─ POST /backend/api/receipts  (multipart, Basic Auth)
              ├─ ① multer 가 메모리에 받음
              ├─ ② Vercel Blob 에 원본 업로드 → public URL 확보
              ├─ ③ DB 에 Receipt(status=PROCESSING) 레코드 생성
              ├─ ④ Upstage Information Extraction 호출 (JSON Schema)
              │     → { vendor, total_amount, purchased_at, items[] }
              └─ ⑤ Receipt 업데이트 + ReceiptItem 일괄 생성
                  → status=PARSED, items 포함 응답
```

---

## 빠른 시작

### 0. 필요한 외부 서비스

| 서비스 | 가입 위치 | 받아 올 값 |
| --- | --- | --- |
| Neon Postgres | https://console.neon.tech | `DATABASE_URL`, `DIRECT_URL` |
| Vercel Blob | Vercel 대시보드 → Storage → Blob | `BLOB_READ_WRITE_TOKEN` |
| Upstage | https://console.upstage.ai | `UPSTAGE_API_KEY` |

### 1. 의존성 설치

```powershell
npm install
```

### 2. 환경 변수 설정

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env.local
```

각 파일을 열어서 값 채우기.
**중요**: `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD` 는 두 파일에 똑같이 입력.

비밀번호 생성 한 줄:
```powershell
node -e "console.log(require('crypto').randomBytes(24).toString('base64'))"
```

### 3. 데이터베이스 마이그레이션

```powershell
npm run db:generate      # Prisma Client
npm run db:migrate       # 테이블 생성
npm run db:studio        # (선택) DB GUI
```

### 4. 로컬 개발

```powershell
npm run dev              # frontend(:3000) + backend(:4000) 동시 실행
```

브라우저로 http://localhost:3000 → Basic Auth 팝업 → ID/PW 입력 → 대시보드.

---

## 테스트 스크립트

OCR 결과만 빠르게 확인하고 싶을 때:

```powershell
cd backend
npx tsx scripts/test-ie.ts
# 또는
$env:TEST_IMAGES='receipt2.png'; npx tsx scripts/test-ie.ts
```

`test_images/` 폴더의 영수증으로 Upstage Information Extraction API 를 호출하여
DB / Blob 없이 추출 결과만 콘솔에 출력한다.

---

## Vercel 배포

프론트엔드와 백엔드를 **각각 별도 Vercel 프로젝트**로 등록.

### 백엔드 먼저

| 항목 | 값 |
| --- | --- |
| Root Directory | `backend` |
| Framework Preset | Other |
| 환경 변수 | `backend/.env.example` 전체 |

배포 완료 후 도메인 메모 (예: `https://receipt-backend.vercel.app`).

### 프론트엔드

| 항목 | 값 |
| --- | --- |
| Root Directory | `frontend` |
| Framework Preset | Next.js |
| 환경 변수 | `frontend/.env.example` 전체 + `BACKEND_URL`(위에서 받은 도메인) |

`next.config.js` 의 rewrites 가 `/backend/*` 요청을 백엔드 도메인으로 프록시 →
브라우저는 항상 같은 origin 으로만 통신하므로 Basic Auth 자격이 자동 전달.

---

## 트러블슈팅

**Upstage 429 Too Many Requests** — 무료 티어는 분당 1회 정도로 제한.
일괄 처리 시 65초 정도 간격을 두거나 유료 플랜으로 업그레이드.

**브라우저에서 Basic Auth 팝업이 안 뜸 / 401 반복** —
`frontend/.env.local` 의 `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD` 와
`backend/.env` 의 값이 정확히 일치하는지 확인.

**`prisma generate` 실패** — Node.js 20 이상인지 확인 (`node -v`).

**Vercel 배포 시 백엔드가 504** — Information Extraction API 응답이 5~10초.
백엔드 Vercel 프로젝트 설정에서 함수 타임아웃을 30초 이상으로 조정.

---

## 기능 체크리스트

- [x] Basic Auth 단일 사용자 보호
- [x] 영수증 이미지 업로드 (Vercel Blob)
- [x] Upstage Information Extraction (vendor / total / date / items)
- [ ] OCR 결과 수정 폼 (UI)
- [ ] 카테고리별 지출 분류
- [ ] 월별 / 기간별 통계 차트
- [ ] 지출 내역 검색 · 필터링
