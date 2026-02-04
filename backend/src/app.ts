import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import Database from "better-sqlite3";
import { createDb } from "./db.js";
import { expenseRoutes } from "./routes/expenses.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export type AppOptions = {
  dbPath?: string;
  logger?: boolean;
};

export function buildApp(opts: AppOptions = {}): { app: ReturnType<typeof Fastify>; db: Database.Database } {
  const db = createDb(opts.dbPath);
  const app = Fastify({ logger: opts.logger ?? true });

  app.register(cors, { origin: true });

  app.get("/health", async () => ({ status: "ok" }));

  expenseRoutes(app, db);

  // Serve frontend static files in production (single-service deploy)
  const frontendDist = path.resolve(__dirname, "../../frontend/dist");
  if (fs.existsSync(frontendDist)) {
    app.register(fastifyStatic, {
      root: frontendDist,
      prefix: "/",
      wildcard: false,
    });

    // SPA fallback: serve index.html for non-API routes
    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith("/expenses") || request.url.startsWith("/health")) {
        return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Not found" } });
      }
      return reply.sendFile("index.html");
    });
  }

  // Expose db for cleanup in tests
  app.addHook("onClose", () => {
    db.close();
  });

  return { app, db };
}
