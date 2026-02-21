// tasks/task_06_anomaly_health/index.js
import { runQuery } from '../../connectors/clickhouse.js';
import { saveJSON, saveReport } from '../../utils/output.js';
import logger from '../../logger/index.js';
import { getConfig } from '../../config/environments.js';
import { buildAnomalyQuery, buildPolicyInsightsQuery } from './queries.js';
import { checkAnomalyStatus, checkInsightsStatus, buildReport } from './report.js';

const TASK_NAME = 'task_06_anomaly_health';
const REGIONS   = ['us', 'ap'];

export async function run() {
  logger.info(`[${TASK_NAME}] ── Starting ──────────────────────────────`);
  const { task06 } = getConfig();

  for (const region of REGIONS) {
    const orgIds = task06.orgIds[region];

    if (!orgIds || orgIds.length === 0) {
      logger.warn(`[${TASK_NAME}:${region}] No org IDs in .env — skipping`);
      continue;
    }

    logger.info(`[${TASK_NAME}:${region}] Checking ${orgIds.length} org(s)...`);

    const orgResults = [];

    for (const orgId of orgIds) {
      logger.info(`[${TASK_NAME}:${region}] Querying org: ${orgId}`);

      try {
        // ── Query 1: Anomaly job last refresh ─────────────
        const anomalyQuery = buildAnomalyQuery(orgId);
        logger.info(
          `[${TASK_NAME}:${region}] Anomaly SQL:\n${anomalyQuery.sql}\n` +
          `Params: ${JSON.stringify(anomalyQuery.params)}`
        );

        const anomalyRows  = await runQuery(anomalyQuery.sql, anomalyQuery.params, region);
        const lastRefresh  = anomalyRows[0]?.lastRefresh ?? null;
        const anomalyCheck = checkAnomalyStatus(lastRefresh);

        if (anomalyCheck.status === 'FLAGGED') {
          logger.warn(
            `[FLAGGED][${region}] Org: ${orgId} | Anomaly job — ${anomalyCheck.label}`
          );
        } else {
          logger.info(
            `[OK][${region}] Org: ${orgId} | Anomaly job — ${anomalyCheck.label}`
          );
        }

        // ── Query 2: Policy insights count ─────────────────
        const insightsQuery = buildPolicyInsightsQuery(orgId);
        logger.info(
          `[${TASK_NAME}:${region}] Insights SQL:\n${insightsQuery.sql}\n` +
          `Params: ${JSON.stringify(insightsQuery.params)}`
        );

        const insightsRows  = await runQuery(insightsQuery.sql, insightsQuery.params, region);
        const insightCount  = Number(insightsRows[0]?.insightCount ?? 0);
        const insightsCheck = checkInsightsStatus(insightCount);

        if (insightsCheck.status === 'FLAGGED') {
          logger.warn(
            `[FLAGGED][${region}] Org: ${orgId} | Policy insights — ${insightsCheck.label}`
          );
        } else {
          logger.info(
            `[OK][${region}] Org: ${orgId} | Policy insights — ${insightsCheck.label}`
          );
        }

        orgResults.push({
          organizationId: orgId,
          anomaly: {
            lastRefresh,
            status: anomalyCheck.status,
            label:  anomalyCheck.label,
            hoursSince: anomalyCheck.hoursSince,
          },
          insights: {
            count:  insightCount,
            status: insightsCheck.status,
            label:  insightsCheck.label,
          },
        });

      } catch (err) {
        // One org failing must not stop the rest
        logger.error(`[${TASK_NAME}:${region}] FAILED for org ${orgId} — ${err.message}`);
        orgResults.push({
          organizationId: orgId,
          error: err.message,
          anomaly:  { status: 'ERROR', label: err.message, lastRefresh: null },
          insights: { status: 'ERROR', label: err.message, count: 0 },
        });
      }
    }

    saveJSON(`${TASK_NAME}_${region}`, orgResults);
    const reportContent = buildReport(region, orgResults);
    saveReport(`${TASK_NAME}_${region}`, reportContent);
  }

  logger.info(`[${TASK_NAME}] ── Done ✓ ────────────────────────────────`);
}
