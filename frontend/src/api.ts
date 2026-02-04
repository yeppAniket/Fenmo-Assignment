const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

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

export async function fetchExpenses(params?: {
  category?: string;
  sort?: string;
  signal?: AbortSignal;
}): Promise<ExpensesResponse> {
  const url = new URL(`${BASE_URL}/expenses`);
  if (params?.category) url.searchParams.set("category", params.category);
  if (params?.sort) url.searchParams.set("sort", params.sort);

  const res = await fetch(url.toString(), { signal: params?.signal });

  if (!res.ok) {
    const body = (await res.json()) as ApiError;
    throw new Error(body.error?.message ?? `Request failed: ${res.status}`);
  }

  return (await res.json()) as ExpensesResponse;
}
