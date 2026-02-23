// tasks/task_customer_happiness/index.js
import { login } from '../../auth/login.js';
import {
  fetchCURAndRefresh,
  fetchAnomalyHealth,
  fetchOrgFinancials,
  fetchUserActivity,
} from './fetchers.js';
import { buildReport } from './report.js';
import { saveJSON, saveReport } from '../../utils/output.js';
import logger from '../../logger/index.js';
import { getConfig } from '../../config/environments.js';

const TASK_NAME = 'task_customer_happiness';
const REGIONS   = ['us', 'ap'];

/**
 * Wraps a fetch call so one source failing doesn't crash the whole org.
 * Returns { data, error } — error is null on success.
 */
async function safe(label, fn) {
  try {
    return { data: await fn(), error: null };
  } catch (err) {
    logger.error(`  [${label}] ${err.message}`);
    return { data: null, error: err.message };
  }
}

export async function run() {
  logger.info(`[${TASK_NAME}] ── Starting ──────────────────────────────`);
  const config = getConfig();

  for (const region of REGIONS) {
    const orgIds     = config.customerHappiness.orgIds[region];
    const task05Cfg  = config.task05[region];

    if (!orgIds || orgIds.length === 0) {
      logger.warn(`[${TASK_NAME}:${region}] No org IDs in .env — skipping`);
      continue;
    }

    logger.info(`[${TASK_NAME}:${region}] Processing ${orgIds.length} org(s)...`);

    // Login once per region — reused for all orgs in that region
    const { data: adminSsid, error: loginError } = await safe(
      'Login',
      () => login({ url: task05Cfg.apiUrl, email: task05Cfg.email, password: task05Cfg.password })
    );

    if (loginError) {
      logger.error(`[${TASK_NAME}:${region}] Admin login failed — financials will be unavailable for all orgs`);
    } else {
      logger.info(`[${TASK_NAME}:${region}] Admin logged in ✓`);
    }

    const orgReports = [];

    for (const orgId of orgIds) {
      logger.info(`[${TASK_NAME}:${region}] ── Org: ${orgId} ──`);

      // ── All four fetches run in parallel ──────────────────
      // Promise.allSettled replaced by safe() wrappers so each
      // source reports its own error without blocking the others
      const [curResult, anomalyResult, financialsResult, userResult] = await Promise.all([
        safe('CUR+Refresh',  () => fetchCURAndRefresh(orgId, region)),
        safe('Anomaly',      () => fetchAnomalyHealth(orgId, region)),
        safe('Financials',   () => adminSsid
          ? fetchOrgFinancials(orgId, adminSsid, task05Cfg.apiUrl)
          : Promise.reject(new Error('Skipped — admin login failed'))
        ),
        safe('UserActivity', () => fetchUserActivity(orgId, region)),
      ]);

      const cur        = curResult.data;
      const anomaly    = anomalyResult.data;
      const financials = financialsResult.data;
      const userAct    = userResult.data;

      const orgReport = {
        organizationId: orgId,
        // Name from financials API, fallback to orgId if API failed
        organizationName: financials?.organizationName ?? null,

        // ── Sheet values ─────────────────────────────────
        awsCUR:                   cur?.awsCUR                   ?? 'ERR',
        azureCUR:                 cur?.azureCUR                 ?? 'ERR',
        gcpCUR:                   cur?.gcpCUR                   ?? 'ERR',
        accountRefresh:           cur?.accountRefresh           ?? 'ERR',
        anomalyRun:               anomaly?.anomalyRun           ?? 'ERR',
        insights:                 anomaly?.insights             ?? 'ERR',
        ytdCost:                  financials?.ytdCost           ?? null,
        ytdAsOf:                  financials?.ytdAsOf           ?? null,
        ytdStartDate:             financials?.ytdStartDate      ?? null,
        ytdEndDate:               financials?.ytdEndDate        ?? null,
        annualisedInsightSavings: financials?.annualisedInsightSavings ?? null,
        insightsBreakdown:        financials?.insightsBreakdown ?? [],
        elasticityMonthlySavings: financials?.elasticityMonthlySavings ?? null,
        elasticityInstanceCount:  financials?.elasticityInstanceCount  ?? null,
        uniqueSignInUsers:        userAct?.uniqueSignInUsers    ?? 0,
        totalActivity:            userAct?.totalActivity        ?? 0,
        signInCount:              userAct?.signInCount          ?? 0,

        // ── Detail for report ─────────────────────────────
        providerDetail:   cur?.detail          ?? null,
        anomalyDetail:    anomaly?.detail?.anomalyDetail  ?? 'N/A',
        insightCount:     anomaly?.detail?.insightCount   ?? 0,

        // ── Per-source error flags ────────────────────────
        curError:           curResult.error,
        anomalyError:       anomalyResult.error,
        financialsError:    financialsResult.error,
        userActivityError:  userResult.error,
      };

      // ── One-line summary log per org ──────────────────────
      logger.info(
        `[${TASK_NAME}:${region}] ✓ ${orgReport.organizationName ?? orgId} | ` +
        `AWS:${orgReport.awsCUR} AZ:${orgReport.azureCUR} GCP:${orgReport.gcpCUR} | ` +
        `Anomaly:${orgReport.anomalyRun} Insights:${orgReport.insights} | ` +
        `Refresh:${orgReport.accountRefresh} | ` +
        `YTD:${orgReport.ytdCost !== null ? '$' + orgReport.ytdCost.toFixed(2) : 'ERR'} | ` +
        `Users:${orgReport.uniqueSignInUsers} Activities:${orgReport.totalActivity}`
      );

      orgReports.push(orgReport);
    }

    saveJSON(`${TASK_NAME}_${region}`, orgReports);
    const reportContent = buildReport(region, orgReports);
    saveReport(`${TASK_NAME}_${region}`, reportContent);
  }

  logger.info(`[${TASK_NAME}] ── Done ✓ ────────────────────────────────`);
}
