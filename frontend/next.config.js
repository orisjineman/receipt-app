/** @type {import('next').NextConfig} */
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4000";

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // Vercel Blob 도메인 (영수증 이미지)
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
  },
  // 백엔드(별도 Vercel 프로젝트)를 같은 origin으로 노출.
  // 브라우저 → /backend/api/... → 프론트 미들웨어 Basic Auth 검증 → 백엔드로 프록시 →
  // 백엔드도 같은 Authorization 헤더로 Basic Auth 검증.
  async rewrites() {
    return [
      {
        source: "/backend/:path*",
        destination: `${BACKEND_URL}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
