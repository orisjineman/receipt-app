// Vercel Serverless Function 진입점.
// vercel.json 의 라우팅이 모든 요청을 이 파일로 보낸다.
import { createApp } from "../src/app";

const app = createApp();

export default app;
