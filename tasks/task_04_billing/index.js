// tasks/task_04_billing/index.js
import { login } from '../../auth/login.js';
import { fetchBilling } from './api.js';
import { buildServicePayload, buildTotalPayload, getDateRange } from './queries.js';
import { buildReport } from './report.js';
import { saveJSON, saveReport } from '../../utils/output.js';
import logger from '../../logger/index.js';
import { getConfig } from '../../config/environments.js';

const TASK_NAME = 'task_04_billing';

export async function run() {
  logger.info(`[${TASK_NAME}] ── Starting ──────────────────────────────`);

  const { billing } = getConfig();
  const { services, accountId } = billing;

  if (!services || services.length === 0) {
    logger.error(`[${TASK_NAME}] No services found in BILLING_SERVICES .env — aborting`);
    return;
  }
  if (!accountId) {
    logger.error(`[${TASK_NAME}] BILLING_ACCOUNT_ID not set in .env — aborting`);
    return;
  }

  // ── Step 1: Login and get ssid cookie ───────────────
  const ssid = await login();

  const { startDate, endDate } = getDateRange();
  logger.info(`[${TASK_NAME}] Date range: ${startDate} → ${endDate}`);
  logger.info(`[${TASK_NAME}] Services to fetch: ${services.length}`);

  const serviceResults = [];

  // ── Step 2: Per-service API calls ───────────────────
  for (const serviceName of services) {
    logger.info(`[${TASK_NAME}] Fetching: ${serviceName}`);

    const payload = buildServicePayload(serviceName, accountId, startDate, endDate);

    // Log payload for manual verification in Insomnia/curl
    logger.info(
      `[${TASK_NAME}] Payload for "${serviceName}":\n${JSON.stringify(payload, null, 2)}`
    );

    const items = await fetchBilling(payload, ssid);
    logger.info(`[${TASK_NAME}] "${serviceName}" → ${items.length} daily record(s)`);

    for (const item of items) {
      logger.info(
        `[${TASK_NAME}]   ${item.usagesStartDate}  │  Cost: $${Number(item.unblendedCost).toFixed(4)}`
      );
    }

    serviceResults.push({ serviceName, items });
  }

  // ── Step 3: Final total API call ────────────────────
  logger.info(`[${TASK_NAME}] Fetching total (billing account excl. all services)...`);

  const totalPayload = buildTotalPayload(services, accountId, startDate, endDate);
//   logger.info(
//     `[${TASK_NAME}] Total payload:\n${JSON.stringify(totalPayload, null, 2)}`
//   );

  const totalItems = await fetchBilling(totalPayload, ssid);
  logger.info(`[${TASK_NAME}] Total → ${totalItems.length} daily record(s)`);

  for (const item of totalItems) {
    logger.info(
      `[${TASK_NAME}]   ${item.usagesStartDate}  │  Cost: $${Number(item.unblendedCost).toFixed(4)}`
    );
  }

  // ── Step 4: Save outputs ────────────────────────────
  const jsonOutput = {
    period: { startDate, endDate },
    accountId,
    perService: serviceResults,
    total: totalItems,
  };

  saveJSON(TASK_NAME, [jsonOutput]);

  const reportContent = buildReport(
    serviceResults,
    totalItems,
    services,
    accountId,
    startDate,
    endDate
  );
  saveReport(TASK_NAME, reportContent);

  logger.info(`[${TASK_NAME}] ── Done ✓ ────────────────────────────────`);
}
