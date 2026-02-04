import { FastifyInstance } from "fastify";
import Database from "better-sqlite3";
import { ExpenseRow } from "../db.js";
import { validateExpenseBody } from "../validators.js";

export function expenseRoutes(app: FastifyInstance, db: Database.Database) {
  const insertStmt = db.prepare(`
    INSERT INTO expenses (amount_paise, category, description, date, created_at, idempotency_key, user)
    VALUES (@amount_paise, @category, @description, @date, @created_at, @idempotency_key, @user)
  `);

  const findByKeyStmt = db.prepare(`
    SELECT * FROM expenses WHERE idempotency_key = ?
  `);

  app.get("/expenses", async (request, reply) => {
    const query = request.query as Record<string, string | undefined>;
    const category = query.category?.trim() || null;
    const user = query.user?.trim() || null;
    const sort = query.sort;

    // Build query with parameterized WHERE clause
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (user) {
      conditions.push("user = ?");
      params.push(user);
    }

    if (category) {
      conditions.push("category = ?");
      params.push(category);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Whitelist valid sort orders to avoid any risk of SQL injection
    const SORT_OPTIONS: Record<string, string> = {
      date_desc: "date DESC, created_at DESC",
      date_asc: "date ASC, created_at ASC",
    };
    const orderBy = SORT_OPTIONS[sort ?? "date_desc"] ?? SORT_OPTIONS.date_desc;

    const rows = db.prepare(
      `SELECT * FROM expenses ${where} ORDER BY ${orderBy}`
    ).all(...params) as ExpenseRow[];

    const totalRow = db.prepare(
      `SELECT COALESCE(SUM(amount_paise), 0) as total FROM expenses ${where}`
    ).get(...params) as { total: number };

    return {
      items: rows.map(formatExpense),
      count: rows.length,
      total_paise: totalRow.total,
    };
  });

  // Summary: total per category
  app.get("/expenses/summary", async (request) => {
    const query = request.query as Record<string, string | undefined>;
    const user = query.user?.trim() || null;

    const where = user ? "WHERE user = ?" : "";
    const params = user ? [user] : [];

    const rows = db.prepare(
      `SELECT category, COALESCE(SUM(amount_paise), 0) as total_paise, COUNT(*) as count
       FROM expenses ${where} GROUP BY category ORDER BY total_paise DESC`
    ).all(...params) as { category: string; total_paise: number; count: number }[];

    const grandTotal = rows.reduce((sum, r) => sum + r.total_paise, 0);

    return { categories: rows, grand_total_paise: grandTotal };
  });

  // List distinct users
  app.get("/users", async () => {
    const rows = db.prepare(
      `SELECT DISTINCT user FROM expenses WHERE user != '' ORDER BY user`
    ).all() as { user: string }[];
    return { users: rows.map((r) => r.user) };
  });

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
        user: result.user,
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
