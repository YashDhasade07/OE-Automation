// tasks/task_05_org_summary/index.js
import { login } from '../../auth/login.js';
import {
  assumeRoleForMSP,
  findUserDetails,
  findBillingCostByDate,
  fetchInsightsPriority,
  fetchElasticityAgentSavings,
} from './api.js';
import { buildReport } from './report.js';
import { saveJSON, saveReport } from '../../utils/output.js';
import logger from '../../logger/index.js';
import { getConfig } from '../../config/environments.js';

const TASK_NAME = 'task_05_org_summary';

export async function run() {
  logger.info(`[${TASK_NAME}] ── Starting ──────────────────────────────`);

  const { task05 } = getConfig();
  const { apiUrl, email, password, orgIds } = task05;

  if (!orgIds || orgIds.length === 0) {
    logger.error(`[${TASK_NAME}] No org IDs in ORG_IDS_TASK05 .env — aborting`);
    return;
  }

  // ── Step 1: Login as Admin ───────────────────────────
  const adminSsid = await login({ url: apiUrl, email, password });
  logger.info(`[${TASK_NAME}] Admin logged in ✓ — processing ${orgIds.length} org(s)`);

  const orgReports = [];

  // ── Step 2: Loop through each org ───────────────────
  for (const orgId of orgIds) {
    logger.info(`[${TASK_NAME}] ── Org: ${orgId} ─────────────────────────`);

    try {
      // API 1: Assume role — get org-scoped ssid
      // adminSsid stays unchanged for next iteration
      const orgSsid = await assumeRoleForMSP(apiUrl, adminSsid, orgId);

      // API 2: Get org name
      const { organizationName, organizationId } = await findUserDetails(apiUrl, orgSsid);

      logger.info(`[${TASK_NAME}] Processing: ${organizationName}`);

      // API 3: YTD cost
      const ytd = await findBillingCostByDate(apiUrl, orgSsid);

      // API 4: Insights savings
      const insights = await fetchInsightsPriority(apiUrl, orgSsid);

      // API 5: Elasticity agent savings
      const elasticity = await fetchElasticityAgentSavings(apiUrl, orgSsid);

      orgReports.push({
        organizationId,
        organizationName,
        ytd,
        insights,
        elasticity,
      });

      logger.info(`[${TASK_NAME}] ✓ ${organizationName} — YTD: $${ytd.totalCost.toFixed(2)} | Insights annualised: $${insights.annualisedSavings.toFixed(2)} | Elasticity annualised: $${elasticity.annualisedSavings.toFixed(2)}`);

    } catch (err) {
      // One org failing must not stop the rest
      logger.error(`[${TASK_NAME}] FAILED for org ${orgId} — ${err.message}`);
      orgReports.push({
        organizationId: orgId,
        organizationName: null,
        error: err.message,
      });
    }
  }

  // ── Step 3: Save outputs ────────────────────────────
  saveJSON(TASK_NAME, orgReports);
  const reportContent = buildReport(orgReports);
  saveReport(TASK_NAME, reportContent);

  logger.info(`[${TASK_NAME}] ── Done ✓ ────────────────────────────────`);
}
