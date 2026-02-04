/**
 * Parse a decimal amount string (e.g. "199.50") into integer paise.
 * Returns null if the string is not a valid non-negative decimal.
 */
export function parsePaise(amount: string): number | null {
  // Allow digits with optional single decimal point
  if (!/^\d+(\.\d{1,2})?$/.test(amount)) {
    return null;
  }

  const parts = amount.split(".");
  const whole = Number(parts[0]);
  const fractional = parts[1] ? Number(parts[1].padEnd(2, "0")) : 0;
  const paise = whole * 100 + fractional;

  return paise;
}
