// auth/login.js
import logger from '../logger/index.js';

/**
 * Logs into the platform with the provided credentials.
 * Returns the ssid cookie value to be sent with all subsequent requests.
 *
 * Reusable across any task — just pass the url, email, password.
 *
 * @param {{ url: string, email: string, password: string }} credentials
 * @returns {Promise<string>} ssid cookie value
 */
export async function login({ url, email, password }) {
  if (!url || !email || !password) {
    throw new Error('[auth] login() requires url, email, and password');
  }

  logger.info(`[auth] Logging in as ${email}...`);

  const payload = {
    operationName: 'Login',
    variables: {},
    query: `mutation Login {
      login(userCredential: { email: "${email}", password: "${password}" }) {
        intent
      }
    }`,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`[auth] Login HTTP error: ${response.status} ${response.statusText}`);
  }

  const body = await response.json();

  if (body.errors?.length > 0) {
    throw new Error(`[auth] Login GraphQL error: ${body.errors[0].message}`);
  }

  const setCookieHeader = response.headers.get('set-cookie');
  if (!setCookieHeader) {
    throw new Error('[auth] Login succeeded but no Set-Cookie header in response');
  }

  const ssidMatch = setCookieHeader.match(/ssid=([^;]+)/);
  if (!ssidMatch) {
    throw new Error('[auth] Login succeeded but ssid cookie not found in Set-Cookie');
  }

  const ssid = ssidMatch[1];
  logger.info(`[auth] Login successful ✓ ssid obtained for ${email}`);
  return ssid;
}
