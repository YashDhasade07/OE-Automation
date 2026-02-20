// tasks/task_02_providers_sync/index.js
import { runQuery } from '../../connectors/mongo.js';
import { saveJSON, saveReport } from '../../utils/output.js';
import logger from '../../logger/index.js';
import { getConfig } from '../../config/environments.js';
import { buildProvidersSyncQuery } from './queries.js';
import { enrichProviders, buildReport } from './report.js';

const TASK_NAME = 'task_02_providers_sync';
const REGIONS   = ['us', 'ap'];

export async function run() {
  logger.info(`[${TASK_NAME}] ── Starting ──────────────────────────────`);
  const { mongo } = getConfig();

  for (const region of REGIONS) {
    try {
      const env           = mongo[region];
      const ignoreOrgIds  = env.ignoreOrgIds_task02;

      if (!env.dbName) {
        logger.error(`[${TASK_NAME}:${region}] No DB name in .env — skipping`);
        continue;
      }

      logger.info(
        `[${TASK_NAME}:${region}] Ignoring ${ignoreOrgIds.length} org(s), ` +
        `fetching providers synced within last 7 days...`
      );

      // const query = buildProvidersSyncQuery(ignoreOrgIds);

      // // ── Query log — copy this into MongoDB shell to verify manually ──
      // logger.info(
      //   `[${TASK_NAME}:${region}] MongoDB shell query:\n` +
      //   `db["providers"].aggregate(${JSON.stringify(query.pipeline, null, 2)})`
      // );
      const rawProviders = await runQuery(buildProvidersSyncQuery(ignoreOrgIds), region);

      // ── Total count log — easy to compare against manual check ──
      logger.info(`[${TASK_NAME}:${region}] Total providers fetched: ${rawProviders.length}`);

      const enriched  = enrichProviders(rawProviders);
      const ok        = enriched.filter(p => p._staleness.status === 'OK').length;
      const warnings  = enriched.filter(p => p._staleness.status === 'WARNING').length;
      const criticals = enriched.filter(p => p._staleness.status === 'CRITICAL').length;
      const unknowns  = enriched.filter(p => p._staleness.status === 'UNKNOWN').length;

      logger.info(`[${TASK_NAME}:${region}] ✅ OK: ${ok} | ⚠️ WARNING: ${warnings} | 🚨 CRITICAL: ${criticals} | ❓ UNKNOWN: ${unknowns}`);

      for (const p of enriched) {
        const s        = p._staleness;
        const orgLabel = p.organizationName ?? p.organizationId;
        if (s.status === 'CRITICAL') {
          logger.error(
            `[CRITICAL][${region}] [${orgLabel}] "${p.accountName}" (${p.cloudProvider}) | not processed for ${s.daysSince} days`
          );
        } else if (s.status === 'WARNING') {
          logger.warn(
            `[WARNING][${region}] [${orgLabel}] "${p.accountName}" (${p.cloudProvider}) | not processed for ${s.daysSince} days`
          );
        }
      }

      saveJSON(`${TASK_NAME}_${region}`, enriched);
      const reportContent = buildReport(region, enriched, ignoreOrgIds);
      saveReport(`${TASK_NAME}_${region}`, reportContent);

    } catch (err) {
      logger.error(`[${TASK_NAME}:${region}] FAILED — ${err.message}`);
      logger.error(err.stack);
    }
  }

  logger.info(`[${TASK_NAME}] ── Done ✓ ────────────────────────────────`);
}
