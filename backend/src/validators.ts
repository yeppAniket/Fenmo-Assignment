import { parsePaise } from "./money.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DESCRIPTION_LENGTH = 200;
const MAX_CATEGORY_LENGTH = 50;
const MAX_USER_LENGTH = 50;

export type ValidationError = {
  code: "VALIDATION_ERROR";
  message: string;
  fields: Record<string, string>;
};

export type ValidatedExpense = {
  amount_paise: number;
  category: string;
  description: string;
  date: string;
  user: string;
};

export function validateExpenseBody(body: unknown): ValidatedExpense | ValidationError {
  if (!body || typeof body !== "object") {
    return {
      code: "VALIDATION_ERROR",
      message: "Request body must be a JSON object",
      fields: {},
    };
  }

  const b = body as Record<string, unknown>;
  const fields: Record<string, string> = {};

  // amount
  if (b.amount === undefined || b.amount === null || b.amount === "") {
    fields.amount = "amount is required";
  } else if (typeof b.amount !== "string") {
    fields.amount = "amount must be a string (e.g. \"199.50\")";
  } else {
    const paise = parsePaise(b.amount);
    if (paise === null) {
      fields.amount = "amount must be a non-negative decimal with up to 2 decimal places";
    }
  }

  // category
  if (b.category === undefined || b.category === null || b.category === "") {
    fields.category = "category is required";
  } else if (typeof b.category !== "string") {
    fields.category = "category must be a string";
  } else if (b.category.trim().length === 0) {
    fields.category = "category must not be blank";
  } else if (b.category.trim().length > MAX_CATEGORY_LENGTH) {
    fields.category = `category must be at most ${MAX_CATEGORY_LENGTH} characters`;
  }

  // date
  if (b.date === undefined || b.date === null || b.date === "") {
    fields.date = "date is required";
  } else if (typeof b.date !== "string") {
    fields.date = "date must be a string in YYYY-MM-DD format";
  } else if (!DATE_RE.test(b.date)) {
    fields.date = "date must be in YYYY-MM-DD format";
  } else {
    // Check it's a real calendar date
    const parsed = new Date(b.date + "T00:00:00Z");
    if (isNaN(parsed.getTime())) {
      fields.date = "date is not a valid calendar date";
    } else {
      // Verify round-trip (catches e.g. 2024-02-30)
      const iso = parsed.toISOString().slice(0, 10);
      if (iso !== b.date) {
        fields.date = "date is not a valid calendar date";
      }
    }
  }

  // description (optional)
  if (b.description !== undefined && b.description !== null) {
    if (typeof b.description !== "string") {
      fields.description = "description must be a string";
    } else if (b.description.length > MAX_DESCRIPTION_LENGTH) {
      fields.description = `description must be at most ${MAX_DESCRIPTION_LENGTH} characters`;
    }
  }

  // user
  if (b.user === undefined || b.user === null || b.user === "") {
    fields.user = "user is required";
  } else if (typeof b.user !== "string") {
    fields.user = "user must be a string";
  } else if (b.user.trim().length === 0) {
    fields.user = "user must not be blank";
  } else if (b.user.trim().length > MAX_USER_LENGTH) {
    fields.user = `user must be at most ${MAX_USER_LENGTH} characters`;
  }

  if (Object.keys(fields).length > 0) {
    return {
      code: "VALIDATION_ERROR",
      message: "Validation failed",
      fields,
    };
  }

  return {
    amount_paise: parsePaise(b.amount as string)!,
    category: (b.category as string).trim(),
    description: typeof b.description === "string" ? b.description : "",
    date: b.date as string,
    user: (b.user as string).trim(),
  };
}
