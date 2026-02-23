// tasks/task_customer_happiness/fetchers.js
import { runQuery as mongoQuery } from '../../connectors/mongo.js';
import { runQuery as clickhouseQuery } from '../../connectors/clickhouse.js';
import { buildProvidersQuery } from '../task_01_providers/queries.js';
import { checkStaleness } from '../task_01_providers/report.js';
import { buildUserTrackingQuery } from '../task_03_user_tracking/queries.js';
import {
  assumeRoleForMSP,
  findUserDetails,
  findBillingCostByDate,
  fetchInsightsPriority,
  fetchElasticityAgentSavings,
} from '../task_05_org_summary/api.js';
import { buildAnomalyQuery, buildPolicyInsightsQuery } from '../task_06_anomaly_health/queries.js';
import { getConfig } from '../../config/environments.js';
import logger from '../../logger/index.js';

const PROVIDER_MAP = {
  AMAZON_WEB_SERVICES:    'aws',
  MICROSOFT_AZURE:        'azure',
  GOOGLE_CLOUD_PLATFORM:  'gcp',
};

// ─────────────────────────────────────────────────────────────────
// Fetch 1: CUR Ingest + Account Refresh  (MongoDB providers)
// ─────────────────────────────────────────────────────────────────
export async function fetchCURAndRefresh(orgId, region) {
  const query      = buildProvidersQuery([orgId]);
  const raw        = await mongoQuery(query, region);
  const enriched   = raw.map(p => ({ ...p, _staleness: checkStaleness(p.lastProcessedTime) }));

  // Group by provider type
  const groups = { aws: [], azure: [], gcp: [] };
  for (const p of enriched) {
    const key = PROVIDER_MAP[p.cloudProvider];
    if (key) groups[key].push(p);
  }

  function curStatus(providers) {
    if (providers.length === 0) return 'N/A';
    return providers.every(p => p._staleness.status === 'OK') ? 'Pass' : 'Fail';
  }

  const accountRefresh = enriched.length === 0
    ? 'N/A'
    : enriched.every(p => p._staleness.status === 'OK') ? 'Pass' : 'Fail';

  return {
    awsCUR:        curStatus(groups.aws),
    azureCUR:      curStatus(groups.azure),
    gcpCUR:        curStatus(groups.gcp),
    accountRefresh,
    detail: groups,   // { aws: [...], azure: [...], gcp: [...] }
  };
}

// ─────────────────────────────────────────────────────────────────
// Fetch 2: Anomaly Run + Insights  (ClickHouse)
// ─────────────────────────────────────────────────────────────────
export async function fetchAnomalyHealth(orgId, region) {
  // Anomaly job
  const anomalyQ    = buildAnomalyQuery(orgId);
  const anomalyRows = await clickhouseQuery(anomalyQ.sql, anomalyQ.params, region);
  const lastRefresh = anomalyRows[0]?.lastRefresh ?? null;

  let anomalyRun, anomalyDetail;
  if (!lastRefresh) {
    anomalyRun    = 'Fail';
    anomalyDetail = 'No records found';
  } else {
    const refreshDate = new Date(lastRefresh.replace(' ', 'T') + 'Z');
    const hoursSince  = (Date.now() - refreshDate.getTime()) / (1000 * 60 * 60);
    anomalyRun    = hoursSince <= 24 ? 'Pass' : 'Fail';
    anomalyDetail = `Last refresh: ${lastRefresh} (${hoursSince.toFixed(1)}h ago)`;
  }

  // Policy insights
  const insightsQ    = buildPolicyInsightsQuery(orgId);
  const insightsRows = await clickhouseQuery(insightsQ.sql, insightsQ.params, region);
  const insightCount = Number(insightsRows[0]?.insightCount ?? 0);
  const insights     = insightCount > 0 ? 'Pass' : 'Fail';

  return {
    anomalyRun,
    insights,
    detail: { lastRefresh, anomalyDetail, insightCount },
  };
}

// ─────────────────────────────────────────────────────────────────
// Fetch 3: YTD + Insight Savings + Elasticity  (API)
// ─────────────────────────────────────────────────────────────────
export async function fetchOrgFinancials(orgId, adminSsid, apiUrl) {
  const orgSsid                               = await assumeRoleForMSP(apiUrl, adminSsid, orgId);
  const { organizationName, organizationId }  = await findUserDetails(apiUrl, orgSsid);
  const ytd                                   = await findBillingCostByDate(apiUrl, orgSsid);
  const insightsSavings                       = await fetchInsightsPriority(apiUrl, orgSsid);
  const elasticity                            = await fetchElasticityAgentSavings(apiUrl, orgSsid);

  return {
    organizationName,
    organizationId,
    ytdCost:                  ytd.totalCost,
    ytdAsOf:                  ytd.asOf,
    ytdStartDate:             ytd.startDate,
    ytdEndDate:               ytd.endDate,
    annualisedInsightSavings: insightsSavings.annualisedSavings,
    insightsBreakdown:        insightsSavings.breakdown,
    elasticityMonthlySavings: elasticity.totalMonthlySavings,
    elasticityInstanceCount:  elasticity.instanceCount,
  };
}

// ─────────────────────────────────────────────────────────────────
// Fetch 4: User activity today  (MongoDB user-tracking)
// ─────────────────────────────────────────────────────────────────
export async function fetchUserActivity(orgId, region) {
  const { ignoreEmails_task03 } = getConfig();
  const query   = buildUserTrackingQuery([orgId], ignoreEmails_task03);
  const results = await mongoQuery(query, region);
  const data    = results[0]; // grouped by org — always 0 or 1 result

  return {
    uniqueSignInUsers: data?.uniqueSignInUsers ?? 0,
    totalActivity:     data?.totalActivity     ?? 0,
    signInCount:       data?.signInCount        ?? 0,
  };
}
