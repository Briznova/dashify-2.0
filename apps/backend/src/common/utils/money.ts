/** Validate a decimal amount string without converting currency to JS floating point. */
export function assertMoneyString(value: string): void {
  if (!/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/.test(value)) {
    throw new Error('Amount must be a non-negative decimal with at most 2 fractional digits');
  }
}
