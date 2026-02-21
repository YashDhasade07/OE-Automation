// tasks/task_06_anomaly_health/report.js

const ANOMALY_THRESHOLD_HOURS  = 24;
const INSIGHTS_THRESHOLD_DAYS  = 7;

/**
 * Checks if lastRefresh is within the last 24 hours.
 * lastRefresh is a ClickHouse DateTime string: "2026-02-21 11:15:32"
 */
export function checkAnomalyStatus(lastRefresh) {
  if (!lastRefresh) {
    return { status: 'FLAGGED', label: 'No records found', hoursSince: null };
  }

  // ClickHouse DateTime has no T or Z — parse manually
  const refreshDate = new Date(lastRefresh.replace(' ', 'T') + 'Z');
  const hoursSince  = (Date.now() - refreshDate.getTime()) / (1000 * 60 * 60);

  if (hoursSince <= ANOMALY_THRESHOLD_HOURS) {
    return {
      status: 'OK',
      label: `${hoursSince.toFixed(1)} hours ago`,
      hoursSince,
    };
  }

  return {
    status: 'FLAGGED',
    label: `${hoursSince.toFixed(1)} hours ago — exceeds ${ANOMALY_THRESHOLD_HOURS}h threshold`,
    hoursSince,
  };
}

/**
 * Checks if insightCount > 0 within last 7 days.
 */
export function checkInsightsStatus(insightCount) {
  if (insightCount > 0) {
    return {
      status: 'OK',
      label: `${insightCount} insight(s) found in last ${INSIGHTS_THRESHOLD_DAYS} days`,
    };
  }
  return {
    status: 'FLAGGED',
    label: `0 insights found in last ${INSIGHTS_THRESHOLD_DAYS} days`,
  };
}

export function buildReport(region, orgResults) {
  const runTime = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const divider = '='.repeat(60);

  const totalOrgs    = orgResults.length;
  const anomalyOk    = orgResults.filter(o => o.anomaly.status    === 'OK').length;
  const insightsOk   = orgResults.filter(o => o.insights.status   === 'OK').length;
  const anomalyFlag  = orgResults.filter(o => o.anomaly.status    === 'FLAGGED').length;
  const insightsFlag = orgResults.filter(o => o.insights.status   === 'FLAGGED').length;

  const lines = [
    divider,
    `  TASK: task_06_anomaly_health`,
    `  REGION: ${region.toUpperCase()}  |  Run at: ${runTime}`,
    divider,
    ``,
    `  SUMMARY`,
    `  Total Orgs Checked : ${totalOrgs}`,
    ``,
    `  Anomaly Job (last 24h)`,
    `  ✅  OK      : ${anomalyOk}`,
    `  🚨  FLAGGED : ${anomalyFlag}`,
    ``,
    `  Policy Insights (last 7 days)`,
    `  ✅  OK      : ${insightsOk}`,
    `  🚨  FLAGGED : ${insightsFlag}`,
    ``,
    `  ── PER ORGANIZATION ──────────────────────────────`,
    ``,
  ];

  for (const org of orgResults) {
    const anomalyIcon  = org.anomaly.status  === 'OK' ? '✅' : '🚨';
    const insightIcon  = org.insights.status === 'OK' ? '✅' : '🚨';

    lines.push(`  ┌─ Org ID: ${org.organizationId}`);

    if (org.error) {
      lines.push(`  │  ❌ QUERY FAILED: ${org.error}`);
      lines.push(`  └${'─'.repeat(50)}`);
      lines.push(``);
      continue;
    }

    // Anomaly job status
    lines.push(`  │  ${anomalyIcon} Anomaly Job`);
    lines.push(`  │     Last Refresh : ${org.anomaly.lastRefresh ?? 'N/A'}`);
    lines.push(`  │     Status       : ${org.anomaly.label}`);
    lines.push(`  │`);

    // Policy insights status
    lines.push(`  │  ${insightIcon} Policy Insights`);
    lines.push(`  │     Count (7d)   : ${org.insights.count}`);
    lines.push(`  │     Status       : ${org.insights.label}`);

    lines.push(`  └${'─'.repeat(50)}`);
    lines.push(``);
  }

  lines.push(divider);
  return lines.join('\n');
}
