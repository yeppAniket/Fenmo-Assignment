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
});
