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
const REGIONS   = ['us', 'ap'];

export async function run() {
  logger.info(`[${TASK_NAME}] ── Starting ──────────────────────────────`);
  const { task05 } = getConfig();

  for (const region of REGIONS) {
    const cfg    = task05[region];
    const orgIds = cfg.orgIds;

    if (!orgIds || orgIds.length === 0) {
      logger.warn(`[${TASK_NAME}:${region}] No org IDs in .env — skipping`);
      continue;
    }

    logger.info(`[${TASK_NAME}:${region}] Logging in as ${cfg.email}...`);
    const adminSsid = await login({ url: cfg.apiUrl, email: cfg.email, password: cfg.password });
    logger.info(`[${TASK_NAME}:${region}] Admin logged in ✓ — processing ${orgIds.length} org(s)`);

    const orgReports = [];

    for (const orgId of orgIds) {
      logger.info(`[${TASK_NAME}:${region}] ── Org: ${orgId}`);
      try {
        const orgSsid            = await assumeRoleForMSP(cfg.apiUrl, adminSsid, orgId);
        const { organizationName, organizationId } = await findUserDetails(cfg.apiUrl, orgSsid);
        logger.info(`[${TASK_NAME}:${region}] Processing: ${organizationName}`);
        const ytd                = await findBillingCostByDate(cfg.apiUrl, orgSsid);
        const insights           = await fetchInsightsPriority(cfg.apiUrl, orgSsid);
        const elasticity         = await fetchElasticityAgentSavings(cfg.apiUrl, orgSsid);

        orgReports.push({ organizationId, organizationName, ytd, insights, elasticity });
        logger.info(`[${TASK_NAME}:${region}] ✓ ${organizationName} — YTD: $${ytd.totalCost.toFixed(2)}`);
      } catch (err) {
        logger.error(`[${TASK_NAME}:${region}] FAILED for org ${orgId} — ${err.message}`);
        orgReports.push({ organizationId: orgId, organizationName: null, error: err.message });
      }
    }

    saveJSON(`${TASK_NAME}_${region}`, orgReports);
    const reportContent = buildReport(orgReports);
    saveReport(`${TASK_NAME}_${region}`, reportContent);
  }

  logger.info(`[${TASK_NAME}] ── Done ✓ ────────────────────────────────`);
}
