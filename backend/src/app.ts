import Fastify from "fastify";
import Database from "better-sqlite3";
import { createDb } from "./db.js";
import { expenseRoutes } from "./routes/expenses.js";

export type AppOptions = {
  dbPath?: string;
  logger?: boolean;
};

export function buildApp(opts: AppOptions = {}): { app: ReturnType<typeof Fastify>; db: Database.Database } {
  const db = createDb(opts.dbPath);
  const app = Fastify({ logger: opts.logger ?? true });

  app.get("/health", async () => ({ status: "ok" }));

  expenseRoutes(app, db);

  // Expose db for cleanup in tests
  app.addHook("onClose", () => {
    db.close();
  });

  return { app, db };
}
