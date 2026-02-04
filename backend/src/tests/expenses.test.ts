import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildApp } from "../app.js";
import type { FastifyInstance } from "fastify";

let app: FastifyInstance;

beforeEach(async () => {
  // Use in-memory SQLite for test isolation
  const built = buildApp({ dbPath: ":memory:", logger: false });
  app = built.app;
  await app.ready();
});

afterEach(async () => {
  await app.close();
});

describe("POST /expenses", () => {
  const validBody = {
    amount: "199.50",
    category: "Food",
    description: "Lunch",
    date: "2025-03-15",
    user: "alice",
  };

  it("creates an expense and returns 201", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/expenses",
      headers: { "idempotency-key": "key-1" },
      payload: validBody,
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.id).toBeDefined();
    expect(body.amount_paise).toBe(19950);
    expect(body.category).toBe("Food");
    expect(body.description).toBe("Lunch");
    expect(body.date).toBe("2025-03-15");
    expect(body.created_at).toBeDefined();
  });

  it("returns same expense on duplicate Idempotency-Key (idempotent replay)", async () => {
    const res1 = await app.inject({
      method: "POST",
      url: "/expenses",
      headers: { "idempotency-key": "key-dup" },
      payload: validBody,
    });

    const res2 = await app.inject({
      method: "POST",
      url: "/expenses",
      headers: { "idempotency-key": "key-dup" },
      payload: validBody,
    });

    expect(res1.statusCode).toBe(201);
    expect(res2.statusCode).toBe(200);
    expect(res1.json().id).toBe(res2.json().id);
  });

  it("only inserts one row for duplicate Idempotency-Key", async () => {
    await app.inject({
      method: "POST",
      url: "/expenses",
      headers: { "idempotency-key": "key-once" },
      payload: validBody,
    });

    await app.inject({
      method: "POST",
      url: "/expenses",
      headers: { "idempotency-key": "key-once" },
      payload: validBody,
    });

    // Different key => different row
    const res3 = await app.inject({
      method: "POST",
      url: "/expenses",
      headers: { "idempotency-key": "key-other" },
      payload: validBody,
    });

    expect(res3.statusCode).toBe(201);
    // id should be 2, not 3 (proving only 2 rows exist)
    expect(res3.json().id).toBe(2);
  });

  it("returns 400 when Idempotency-Key header is missing", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/expenses",
      payload: validBody,
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("MISSING_IDEMPOTENCY_KEY");
  });

  it("returns 400 for missing amount", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/expenses",
      headers: { "idempotency-key": "key-val-1" },
      payload: { category: "Food", date: "2025-03-15" },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("VALIDATION_ERROR");
    expect(res.json().error.fields.amount).toBeDefined();
  });

  it("returns 400 for negative amount (no leading minus allowed)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/expenses",
      headers: { "idempotency-key": "key-val-2" },
      payload: { ...validBody, amount: "-10.00" },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.fields.amount).toBeDefined();
  });

  it("returns 400 for invalid date format", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/expenses",
      headers: { "idempotency-key": "key-val-3" },
      payload: { ...validBody, date: "15-03-2025" },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.fields.date).toBeDefined();
  });

  it("returns 400 for impossible calendar date", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/expenses",
      headers: { "idempotency-key": "key-val-4" },
      payload: { ...validBody, date: "2025-02-30" },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.fields.date).toBeDefined();
  });

  it("returns 400 for missing category", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/expenses",
      headers: { "idempotency-key": "key-val-5" },
      payload: { amount: "10.00", date: "2025-03-15" },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.fields.category).toBeDefined();
  });

  it("returns 400 for description over 200 chars", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/expenses",
      headers: { "idempotency-key": "key-val-6" },
      payload: { ...validBody, description: "a".repeat(201) },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.fields.description).toBeDefined();
  });

  it("accepts whole number amount without decimals", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/expenses",
      headers: { "idempotency-key": "key-whole" },
      payload: { ...validBody, amount: "200" },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().amount_paise).toBe(20000);
  });

  it("returns 400 for missing user", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/expenses",
      headers: { "idempotency-key": "key-nouser" },
      payload: { amount: "10.00", category: "Food", date: "2025-03-15" },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.fields.user).toBeDefined();
  });
});

// --- Helper to seed expenses ---
async function seed(
  app: FastifyInstance,
  items: { amount: string; category: string; date: string; key: string; description?: string; user?: string }[]
) {
  for (const item of items) {
    await app.inject({
      method: "POST",
      url: "/expenses",
      headers: { "idempotency-key": item.key },
      payload: {
        amount: item.amount,
        category: item.category,
        date: item.date,
        description: item.description ?? "",
        user: item.user ?? "testuser",
      },
    });
  }
}

describe("GET /expenses", () => {
  it("returns all expenses with count and total_paise", async () => {
    await seed(app, [
      { amount: "100.00", category: "Food", date: "2025-03-10", key: "g1" },
      { amount: "50.50", category: "Transport", date: "2025-03-11", key: "g2" },
    ]);

    const res = await app.inject({ method: "GET", url: "/expenses" });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.count).toBe(2);
    expect(body.total_paise).toBe(15050); // 10000 + 5050
    expect(body.items).toHaveLength(2);
  });

  it("returns empty list when no expenses exist", async () => {
    const res = await app.inject({ method: "GET", url: "/expenses" });

    const body = res.json();
    expect(body.count).toBe(0);
    expect(body.total_paise).toBe(0);
    expect(body.items).toHaveLength(0);
  });

  it("filters by category", async () => {
    await seed(app, [
      { amount: "100.00", category: "Food", date: "2025-03-10", key: "f1" },
      { amount: "200.00", category: "Transport", date: "2025-03-11", key: "f2" },
      { amount: "50.00", category: "Food", date: "2025-03-12", key: "f3" },
    ]);

    const res = await app.inject({
      method: "GET",
      url: "/expenses?category=Food",
    });

    const body = res.json();
    expect(body.count).toBe(2);
    expect(body.items.every((e: { category: string }) => e.category === "Food")).toBe(true);
    expect(body.total_paise).toBe(15000); // 10000 + 5000
  });

  it("returns empty when filtering by non-existent category", async () => {
    await seed(app, [
      { amount: "100.00", category: "Food", date: "2025-03-10", key: "ne1" },
    ]);

    const res = await app.inject({
      method: "GET",
      url: "/expenses?category=Entertainment",
    });

    const body = res.json();
    expect(body.count).toBe(0);
    expect(body.total_paise).toBe(0);
  });

  it("sorts by date descending by default (newest first)", async () => {
    await seed(app, [
      { amount: "10.00", category: "Food", date: "2025-03-01", key: "s1" },
      { amount: "20.00", category: "Food", date: "2025-03-15", key: "s2" },
      { amount: "30.00", category: "Food", date: "2025-03-10", key: "s3" },
    ]);

    const res = await app.inject({ method: "GET", url: "/expenses" });
    const dates = res.json().items.map((e: { date: string }) => e.date);

    expect(dates).toEqual(["2025-03-15", "2025-03-10", "2025-03-01"]);
  });

  it("supports sort=date_desc explicitly", async () => {
    await seed(app, [
      { amount: "10.00", category: "Food", date: "2025-01-01", key: "sd1" },
      { amount: "20.00", category: "Food", date: "2025-12-31", key: "sd2" },
    ]);

    const res = await app.inject({
      method: "GET",
      url: "/expenses?sort=date_desc",
    });

    const dates = res.json().items.map((e: { date: string }) => e.date);
    expect(dates).toEqual(["2025-12-31", "2025-01-01"]);
  });

  it("supports sort=date_asc", async () => {
    await seed(app, [
      { amount: "10.00", category: "Food", date: "2025-03-15", key: "sa1" },
      { amount: "20.00", category: "Food", date: "2025-03-01", key: "sa2" },
    ]);

    const res = await app.inject({
      method: "GET",
      url: "/expenses?sort=date_asc",
    });

    const dates = res.json().items.map((e: { date: string }) => e.date);
    expect(dates).toEqual(["2025-03-01", "2025-03-15"]);
  });

  it("total_paise matches sum of returned items", async () => {
    await seed(app, [
      { amount: "33.33", category: "Food", date: "2025-03-10", key: "t1" },
      { amount: "66.67", category: "Food", date: "2025-03-11", key: "t2" },
      { amount: "100.00", category: "Transport", date: "2025-03-12", key: "t3" },
    ]);

    // Unfiltered
    const all = await app.inject({ method: "GET", url: "/expenses" });
    const allBody = all.json();
    const allSum = allBody.items.reduce((s: number, e: { amount_paise: number }) => s + e.amount_paise, 0);
    expect(allBody.total_paise).toBe(allSum);

    // Filtered
    const filtered = await app.inject({ method: "GET", url: "/expenses?category=Food" });
    const filteredBody = filtered.json();
    const filteredSum = filteredBody.items.reduce((s: number, e: { amount_paise: number }) => s + e.amount_paise, 0);
    expect(filteredBody.total_paise).toBe(filteredSum);
  });

  it("filters by user", async () => {
    await seed(app, [
      { amount: "100.00", category: "Food", date: "2025-03-10", key: "u1", user: "alice" },
      { amount: "200.00", category: "Food", date: "2025-03-11", key: "u2", user: "bob" },
      { amount: "50.00", category: "Transport", date: "2025-03-12", key: "u3", user: "alice" },
    ]);

    const res = await app.inject({
      method: "GET",
      url: "/expenses?user=alice",
    });

    const body = res.json();
    expect(body.count).toBe(2);
    expect(body.total_paise).toBe(15000); // 10000 + 5000
  });

  it("filter + sort work together", async () => {
    await seed(app, [
      { amount: "10.00", category: "Food", date: "2025-03-01", key: "fs1" },
      { amount: "20.00", category: "Transport", date: "2025-03-05", key: "fs2" },
      { amount: "30.00", category: "Food", date: "2025-03-10", key: "fs3" },
    ]);

    const res = await app.inject({
      method: "GET",
      url: "/expenses?category=Food&sort=date_asc",
    });

    const body = res.json();
    expect(body.count).toBe(2);
    expect(body.items[0].date).toBe("2025-03-01");
    expect(body.items[1].date).toBe("2025-03-10");
  });
});

describe("GET /expenses/summary", () => {
  it("returns per-category totals sorted by amount descending", async () => {
    await seed(app, [
      { amount: "100.00", category: "Food", date: "2025-03-10", key: "sm1" },
      { amount: "50.00", category: "Food", date: "2025-03-11", key: "sm2" },
      { amount: "200.00", category: "Transport", date: "2025-03-12", key: "sm3" },
    ]);

    const res = await app.inject({ method: "GET", url: "/expenses/summary" });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.categories).toHaveLength(2);
    // Transport (20000) should be first (highest)
    expect(body.categories[0].category).toBe("Transport");
    expect(body.categories[0].total_paise).toBe(20000);
    expect(body.categories[0].count).toBe(1);
    // Food (15000) second
    expect(body.categories[1].category).toBe("Food");
    expect(body.categories[1].total_paise).toBe(15000);
    expect(body.categories[1].count).toBe(2);
    // Grand total
    expect(body.grand_total_paise).toBe(35000);
  });

  it("filters summary by user", async () => {
    await seed(app, [
      { amount: "100.00", category: "Food", date: "2025-03-10", key: "su1", user: "alice" },
      { amount: "200.00", category: "Transport", date: "2025-03-11", key: "su2", user: "bob" },
    ]);

    const res = await app.inject({ method: "GET", url: "/expenses/summary?user=alice" });
    const body = res.json();
    expect(body.categories).toHaveLength(1);
    expect(body.categories[0].category).toBe("Food");
    expect(body.grand_total_paise).toBe(10000);
  });

  it("returns empty categories when no expenses exist", async () => {
    const res = await app.inject({ method: "GET", url: "/expenses/summary" });

    const body = res.json();
    expect(body.categories).toHaveLength(0);
    expect(body.grand_total_paise).toBe(0);
  });
});
