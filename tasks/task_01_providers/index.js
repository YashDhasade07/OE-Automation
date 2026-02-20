// tasks/task_01_providers/index.js
import { runQuery, connect } from '../../connectors/mongo.js';
import { saveJSON, saveReport } from '../../utils/output.js';
import logger from '../../logger/index.js';
import { getConfig } from '../../config/environments.js';
import { buildProvidersQuery } from './queries.js';
import { enrichProviders, buildReport } from './report.js';

const TASK_NAME = 'task_01_providers';
const REGIONS = ['us', 'ap'];

export async function run() {
  logger.info(`[${TASK_NAME}] ── Starting ──────────────────────────────`);
  const { mongo } = getConfig();

  for (const region of REGIONS) {
    try {
      const env = mongo[region];
      const orgIds = env.orgIds;

      if (!env.dbName) {
        logger.error(`[${TASK_NAME}:${region}] No DB name set in .env — skipping region`);
        continue;
      }

      if (!orgIds || orgIds.length === 0) {
        logger.warn(`[${TASK_NAME}:${region}] No org IDs in .env — skipping region`);
        continue;
      }

      logger.info(`[${TASK_NAME}:${region}] Querying ${orgIds.length} org(s) in DB "${env.dbName}"...`);

      const rawProviders = await runQuery(buildProvidersQuery(orgIds), region);
      logger.info(`[${TASK_NAME}:${region}] Fetched ${rawProviders.length} provider(s)`);

    //   if (rawProviders.length > 0) {
    //     logger.info(`[${TASK_NAME}:${region}] Sample doc: ${JSON.stringify(rawProviders[0], null, 2)}`);
    //   }

      const enriched = enrichProviders(rawProviders);

      for (const p of enriched) {
        const s = p._staleness;
        if (s.status === 'CRITICAL') {
          logger.error(
            `[CRITICAL][${region}] "${p.accountName}" (${p.cloudProvider}) | org: ${p.organizationId} | not processed for ${s.daysSince} days`
          );
        } else if (s.status === 'WARNING') {
          logger.warn(
            `[WARNING][${region}] "${p.accountName}" (${p.cloudProvider}) | org: ${p.organizationId} | not processed for ${s.daysSince} days`
          );
        }
      }

      saveJSON(`${TASK_NAME}_${region}`, enriched);
      const reportContent = buildReport(region, enriched);
      saveReport(`${TASK_NAME}_${region}`, reportContent);

    } catch (err) {
      logger.error(`[${TASK_NAME}:${region}] FAILED — ${err.message}`);
      logger.error(err.stack);
    }
  }

  logger.info(`[${TASK_NAME}] ── Done ✓ ────────────────────────────────`);
}
