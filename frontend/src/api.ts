import { httpGet, httpPost } from "./httpClient.ts";

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

export type CreateExpensePayload = {
  amount: string;
  category: string;
  description?: string;
  date: string;
  user: string;
};

export type CategorySummary = {
  category: string;
  total_paise: number;
  count: number;
};

export type SummaryResponse = {
  categories: CategorySummary[];
  grand_total_paise: number;
};

export async function createExpense(
  payload: CreateExpensePayload,
  idempotencyKey: string,
): Promise<Expense> {
  return httpPost<Expense>("/expenses", payload, {
    "Idempotency-Key": idempotencyKey,
  });
}

export async function fetchSummary(user: string, signal?: AbortSignal): Promise<SummaryResponse> {
  const query = new URLSearchParams();
  if (user) query.set("user", user);
  const qs = query.toString();
  return httpGet<SummaryResponse>(`/expenses/summary${qs ? `?${qs}` : ""}`, signal);
}

export async function fetchExpenses(params?: {
  category?: string;
  sort?: string;
  user?: string;
  signal?: AbortSignal;
}): Promise<ExpensesResponse> {
  const query = new URLSearchParams();
  if (params?.user) query.set("user", params.user);
  if (params?.category) query.set("category", params.category);
  if (params?.sort) query.set("sort", params.sort);
  const qs = query.toString();
  return httpGet<ExpensesResponse>(
    `/expenses${qs ? `?${qs}` : ""}`,
    params?.signal,
  );
}
