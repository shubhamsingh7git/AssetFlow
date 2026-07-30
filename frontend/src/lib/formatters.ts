// ─── AssetFlow Localization & Formatting Utilities ─────────────────────────
// Indian Numbering System (Lakhs / Crores) & Currency Formatting

/**
 * Formats a number or string into Indian Rupee format (e.g. ₹1,20,000 or ₹25,000)
 */
export function formatINR(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return '₹0';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '₹0';

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(num);
}

/**
 * Formats a number using the Indian Lakhs/Crores notation without currency symbol
 */
export function formatIndianNumber(num: number | string): string {
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(n)) return '0';
  return new Intl.NumberFormat('en-IN').format(n);
}

/**
 * Normalizes phone number display to Indian (+91) format if applicable
 */
export function formatIndianPhone(phone: string | null | undefined): string {
  if (!phone) return '+91 98765 43210';
  if (phone.startsWith('+91')) return phone;
  if (phone.startsWith('+')) return phone;
  return `+91 ${phone}`;
}
