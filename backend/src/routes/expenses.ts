import { FastifyInstance } from "fastify";
import Database from "better-sqlite3";
import { ExpenseRow } from "../db.js";
import { validateExpenseBody } from "../validators.js";

export function expenseRoutes(app: FastifyInstance, db: Database.Database) {
  const insertStmt = db.prepare(`
    INSERT INTO expenses (amount_paise, category, description, date, created_at, idempotency_key)
    VALUES (@amount_paise, @category, @description, @date, @created_at, @idempotency_key)
  `);

  const findByKeyStmt = db.prepare(`
    SELECT * FROM expenses WHERE idempotency_key = ?
  `);

  app.post("/expenses", async (request, reply) => {
    // 1. Require Idempotency-Key header
    const idempotencyKey = request.headers["idempotency-key"];
    if (!idempotencyKey || typeof idempotencyKey !== "string" || idempotencyKey.trim().length === 0) {
      return reply.status(400).send({
        error: {
          code: "MISSING_IDEMPOTENCY_KEY",
          message: "Idempotency-Key header is required",
        },
      });
    }

    // 2. Validate body
    const result = validateExpenseBody(request.body);
    if ("code" in result) {
      return reply.status(400).send({ error: result });
    }

    // 3. Try insert; handle UNIQUE violation for idempotent replay
    const now = new Date().toISOString();

    try {
      insertStmt.run({
        amount_paise: result.amount_paise,
        category: result.category,
        description: result.description,
        date: result.date,
        created_at: now,
        idempotency_key: idempotencyKey,
      });

      const inserted = findByKeyStmt.get(idempotencyKey) as ExpenseRow;
      return reply.status(201).send(formatExpense(inserted));
    } catch (err: unknown) {
      // SQLite UNIQUE constraint error code
      if (
        err instanceof Database.SqliteError &&
        err.code === "SQLITE_CONSTRAINT_UNIQUE"
      ) {
        const existing = findByKeyStmt.get(idempotencyKey) as ExpenseRow;
        return reply.status(200).send(formatExpense(existing));
      }
      throw err;
    }
  });
}

function formatExpense(row: ExpenseRow) {
  return {
    id: row.id,
    amount_paise: row.amount_paise,
    category: row.category,
    description: row.description,
    date: row.date,
    created_at: row.created_at,
  };
}
