import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { corsOrigins, env } from "./config/env";
import receiptsRouter from "./routes/receipts";
import expensesRouter from "./routes/expenses";
import categoriesRouter from "./routes/categories";
import { errorHandler, notFound } from "./middleware/error";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(
    cors({
      origin: corsOrigins,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  if (env.NODE_ENV !== "test") {
    app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
  }

  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 120,
      standardHeaders: "draft-7",
      legacyHeaders: false,
    }),
  );

  app.get("/health", (_req, res) => {
    res.json({ ok: true, ts: new Date().toISOString() });
  });

  app.use("/api/receipts", receiptsRouter);
  app.use("/api/expenses", expensesRouter);
  app.use("/api/categories", categoriesRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
