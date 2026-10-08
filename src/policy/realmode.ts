/**
 * Hard real-mode gate. Mock / seed / simulated commercial activity is forbidden.
 */

export function mocksAllowed(): boolean {
  return process.env.ALLOW_MOCK === "1";
}

export function requireReal(action: string): void {
  if (mocksAllowed()) return;
  throw new Error(
    `REAL_MODE: ${action} blocked. Mock/synthetic commercial data is disabled. Provide real credentials and real prospects.`,
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
  return {
    mocksAllowed: mocksAllowed(),
    freellmapi: Boolean(process.env.FREELLMAPI_API_KEY),
    email: emailReady(),
    payments: paymentsReady(),
    canOutreach: emailReady() && !mocksAllowed(),
    canInvoice: paymentsReady() && !mocksAllowed(),
  };
}
