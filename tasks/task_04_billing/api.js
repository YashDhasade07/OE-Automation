// tasks/task_04_billing/api.js
import logger from '../../logger/index.js';
import { getConfig } from '../../config/environments.js';

/**
 * Fires a GraphQL request to the billing API with the ssid cookie.
 * Returns the billingItemResponse array.
 */
export async function fetchBilling(payload, ssid) {
  const { billing } = getConfig();

  const response = await fetch(billing.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `ssid=${ssid}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Billing API HTTP error: ${response.status} ${response.statusText}`);
  }

  const body = await response.json();

  if (body.errors?.length > 0) {
    throw new Error(`Billing API GraphQL error: ${body.errors[0].message}`);
  }

  return body?.data?.findBillingDetails?.billingItemResponse ?? [];
}
