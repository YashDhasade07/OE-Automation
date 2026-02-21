// tasks/task_06_anomaly_health/queries.js

/**
 * Query 1 — Get the single most recent lastmodifieddate for an org in anomalies_test.
 * We only need MAX(lastmodifieddate) — no grouping by createdat needed.
 * ClickHouse parameterized query syntax: {param:Type}
 */
export function buildAnomalyQuery(organizationId) {
    return {
      sql: `
        SELECT
          organizationid,
          MAX(lastmodifieddate) AS lastRefresh
        FROM anomalies_test
        WHERE organizationid = {organizationId:String}
        GROUP BY organizationid
      `.trim(),
      params: { organizationId },
    };
  }
  
  /**
   * Query 2 — Count policy insights for an org within the last 7 days.
   * Flags the org if count = 0.
   */
  export function buildPolicyInsightsQuery(organizationId) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10); // YYYY-MM-DD
  
    return {
      sql: `
        SELECT count(*) AS insightCount
        FROM policy_insights_
        WHERE organizationId = {organizationId:String}
          AND lastObserved >= {sevenDaysAgo:String}
      `.trim(),
      params: { organizationId, sevenDaysAgo: sevenDaysAgoStr },
    };
  }
  