// tasks/task_03_user_tracking/index.js
import { runQuery } from '../../connectors/mongo.js';
import { saveJSON, saveReport } from '../../utils/output.js';
import logger from '../../logger/index.js';
import { getConfig } from '../../config/environments.js';
import { buildUserTrackingQuery } from './queries.js';
import { buildReport } from './report.js';

const TASK_NAME = 'task_03_user_tracking';
const REGIONS   = ['us', 'ap'];

export async function run() {
  logger.info(`[${TASK_NAME}] ── Starting ──────────────────────────────`);
  const config = getConfig();

  const ignoreEmails = config.ignoreEmails_task03;
  logger.info(`[${TASK_NAME}] Ignoring ${ignoreEmails.length} email(s)`);

  for (const region of REGIONS) {
    try {
      const env    = config.mongo[region];
      const orgIds = env.orgIds_task03;

      if (!env.dbName) {
        logger.error(`[${TASK_NAME}:${region}] No DB name in .env — skipping`);
        continue;
      }
      if (!orgIds || orgIds.length === 0) {
        logger.warn(`[${TASK_NAME}:${region}] No org IDs in .env — skipping`);
        continue;
      }

      logger.info(`[${TASK_NAME}:${region}] Monitoring ${orgIds.length} org(s) for today's activity...`);

      const query = buildUserTrackingQuery(orgIds, ignoreEmails);

      // ── Shell query log for manual verification ──
    //   logger.info(
    //     `[${TASK_NAME}:${region}] MongoDB shell query:\n` +
    //     `db["user-tracking"].aggregate(${JSON.stringify(query.pipeline, null, 2)})`
    //   );

      const results = await runQuery(query, region);

      // ── Summary log ──
      const totalActivity = results.reduce((sum, r) => sum + r.totalActivity, 0);
      const totalSignIns  = results.reduce((sum, r) => sum + r.signInCount, 0);
      const totalUnique   = results.reduce((sum, r) => sum + r.uniqueSignInUsers, 0);

      logger.info(`[${TASK_NAME}:${region}] Total orgs with activity : ${results.length} / ${orgIds.length}`);
      logger.info(`[${TASK_NAME}:${region}] Total activity today     : ${totalActivity}`);
      logger.info(`[${TASK_NAME}:${region}] Total sign-ins today     : ${totalSignIns}`);
      logger.info(`[${TASK_NAME}:${region}] Unique users signed in   : ${totalUnique}`);

      // ── Per-org log ──
      for (const r of results) {
        logger.info(
          `[${TASK_NAME}:${region}] [${r.organizationName ?? r.organizationId}] ` +
          `activity: ${r.totalActivity} | sign-ins: ${r.signInCount} | unique users: ${r.uniqueSignInUsers}`
        );
      }

      saveJSON(`${TASK_NAME}_${region}`, results);
      const reportContent = buildReport(region, results, orgIds, ignoreEmails);
      saveReport(`${TASK_NAME}_${region}`, reportContent);

    } catch (err) {
      logger.error(`[${TASK_NAME}:${region}] FAILED — ${err.message}`);
      logger.error(err.stack);
    }
  }

  logger.info(`[${TASK_NAME}] ── Done ✓ ────────────────────────────────`);
}
