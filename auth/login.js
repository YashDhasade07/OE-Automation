// auth/login.js
import logger from '../logger/index.js';
import { getConfig } from '../config/environments.js';

/**
 * Logs into the billing platform using credentials from .env.
 * Returns the ssid cookie value to be sent with all subsequent requests.
 * Reusable across any task that needs API authentication.
 */
export async function login() {
  const { billing } = getConfig();

  if (!billing.apiUrl || !billing.email || !billing.password) {
    throw new Error('[auth] BILLING_API_URL, BILLING_EMAIL or BILLING_PASSWORD missing in .env');
  }

  logger.info(`[auth] Logging in as ${billing.email}...`);

  const payload = {
    operationName: 'Login',
    variables: {},
    query: `mutation Login {
      login(userCredential: { email: "${billing.email}", password: "${billing.password}" }) {
        intent
      }
    }`,
  };

  const response = await fetch(billing.apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`[auth] Login HTTP error: ${response.status} ${response.statusText}`);
  }

  const body = await response.json();

  // Check for GraphQL-level errors
  if (body.errors?.length > 0) {
    throw new Error(`[auth] Login GraphQL error: ${body.errors[0].message}`);
  }

  // Extract ssid from Set-Cookie header
  const setCookieHeader = response.headers.get('set-cookie');
  if (!setCookieHeader) {
    throw new Error('[auth] Login succeeded but no Set-Cookie header found in response');
  }

  const ssidMatch = setCookieHeader.match(/ssid=([^;]+)/);
  if (!ssidMatch) {
    throw new Error('[auth] Login succeeded but ssid cookie not found in Set-Cookie header');
  }

  const ssid = ssidMatch[1];
  logger.info('[auth] Login successful ✓ ssid cookie obtained');
  return ssid;
}
