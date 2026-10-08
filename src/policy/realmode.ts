/**
 * Hard real-mode gate. Mock / seed / synthetic commercial activity is forbidden.
 * Stripe is optional until a buyer is ready to pay.
 */

export function mocksAllowed(): boolean {
  return process.env.ALLOW_MOCK === "1";
}

export function requireReal(action: string): void {
  if (mocksAllowed()) return;
  throw new Error(
    `REAL_MODE: ${action} blocked. Mock/synthetic commercial data is disabled.`,
  );
}

/** True when a live payment provider can clear funds. */
export function paymentsReady(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET,
  );
}

/** True when a live outbound email channel can send. */
export function emailReady(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.OUTREACH_FROM_EMAIL,
  );
}

export function realReadiness() {
  const email = emailReady();
  const payments = paymentsReady();
  return {
    mocksAllowed: mocksAllowed(),
    freellmapi: Boolean(process.env.FREELLMAPI_API_KEY),
    email,
    payments,
    /** Sell loop: demos + outreach. Stripe not required yet. */
    canOutreach: email && !mocksAllowed(),
    canInvoice: payments && !mocksAllowed(),
    paymentGateDeferred: !payments,
  };
}
