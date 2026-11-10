// Field rules shared by every web form; the same limits as the apps (inntown_core) and the API.
// Each check returns an error message to show next to the field, or "" when the value is fine.
// The API validates again; these only stop mistakes while typing.

export const LIMITS = {
  phone: 10,
  otp: 6,
  name: 60,
  address: 200,
  area: 80,
  fssai: 14,
  upi: 50,
  dishName: 50,
  dishDesc: 80,
  category: 30,
  reply: 500,
  priceMax: 5000,
  packFeeMax: 50,
} as const;

const PHONE = /^[6-9]\d{9}$/;
const UPI = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9]{1,63}$/;

/** Input filters: apply in onChange so invalid characters never appear in the field. */
export const onlyDigits = (v: string, max: number) => v.replace(/\D/g, "").slice(0, max);

export const check = {
  required: (v: string, label: string) => (v.trim() ? "" : `Enter ${label}.`),
  phone: (v: string) => (!v ? "Enter a mobile number." : PHONE.test(v) ? "" : "Enter a 10-digit mobile number starting with 6, 7, 8 or 9."),
  fssai: (v: string) => (!v || /^\d{14}$/.test(v) ? "" : "FSSAI number has 14 digits."),
  upi: (v: string) => (!v || UPI.test(v.trim()) ? "" : "Enter a UPI ID like name@okbank."),
  price: (v: number, label = "Price") =>
    Number.isInteger(v) && v >= 1 && v <= LIMITS.priceMax ? "" : `${label} must be a whole number from ₹1 to ₹${LIMITS.priceMax.toLocaleString("en-IN")}.`,
};

/** Whole-rupee input: digits only, capped, "" while empty. */
export const rupees = (v: string, max: number) => {
  const d = v.replace(/\D/g, "").slice(0, String(max).length);
  return d === "" ? 0 : Math.min(Number(d), max);
};
