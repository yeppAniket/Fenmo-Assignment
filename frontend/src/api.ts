const BASE_URL = import.meta.env.VITE_API_URL ?? "";

export type Expense = {
  id: number;
  amount_paise: number;
  category: string;
  description: string;
  date: string;
  created_at: string;
};

export type ExpensesResponse = {
  items: Expense[];
  count: number;
  total_paise: number;
};

export type ApiError = {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
};

export type CreateExpensePayload = {
  amount: string;
  category: string;
  description?: string;
  date: string;
};

export async function createExpense(
  payload: CreateExpensePayload,
  idempotencyKey: string,
): Promise<Expense> {
  const res = await fetch(`${BASE_URL}/expenses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = (await res.json()) as ApiError;
    throw new Error(body.error?.message ?? `Request failed: ${res.status}`);
  }

  return (await res.json()) as Expense;
}

export async function fetchExpenses(params?: {
  category?: string;
  sort?: string;
  signal?: AbortSignal;
}): Promise<ExpensesResponse> {
  const query = new URLSearchParams();
  if (params?.category) query.set("category", params.category);
  if (params?.sort) query.set("sort", params.sort);
  const qs = query.toString();
  const url = `${BASE_URL}/expenses${qs ? `?${qs}` : ""}`;

  const res = await fetch(url, { signal: params?.signal });

  if (!res.ok) {
    const body = (await res.json()) as ApiError;
    throw new Error(body.error?.message ?? `Request failed: ${res.status}`);
  }

  return (await res.json()) as ExpensesResponse;
}
