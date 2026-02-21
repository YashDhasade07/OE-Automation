// tasks/task_05_org_summary/api.js
import logger from '../../logger/index.js';

/**
 * Base GraphQL fetch — sends ssid cookie with every request.
 */
async function gql(url, payload, ssid) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `ssid=${ssid}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  const body = await response.json();
  if (body.errors?.length > 0) {
    throw new Error(`GraphQL error: ${body.errors[0].message}`);
  }

  // Return body AND the new ssid cookie if present
  const setCookieHeader = response.headers.get('set-cookie');
  const newSsidMatch = setCookieHeader?.match(/ssid=([^;]+)/);
  const newSsid = newSsidMatch ? newSsidMatch[1] : null;

  return { body, newSsid };
}

/**
 * API 1 — AssumeRoleForMSP
 * Switches context to the given org using admin ssid.
 * Returns the new org-scoped ssid cookie.
 */
export async function assumeRoleForMSP(url, adminSsid, organizationId) {
  logger.info(`[api] AssumeRoleForMSP for org: ${organizationId}`);

  const payload = {
    operationName: 'AssumeRoleForMSP',
    variables: { organizationId },
    query: `mutation AssumeRoleForMSP($organizationId: String!) {\n  assumeRoleForMSP(organizationId: $organizationId)\n}`,
  };

  const { body, newSsid } = await gql(url, payload, adminSsid);

  if (!body.data?.assumeRoleForMSP) {
    throw new Error(`AssumeRoleForMSP returned false for org: ${organizationId}`);
  }
  if (!newSsid) {
    throw new Error(`AssumeRoleForMSP succeeded but no new ssid cookie returned for org: ${organizationId}`);
  }

  logger.info(`[api] Role assumed ✓ — new org ssid obtained`);
  return newSsid;
}

/**
 * API 2 — FindUserDetails
 * Returns { organizationId, organizationName } for the assumed org.
 */
export async function findUserDetails(url, orgSsid) {
  logger.info(`[api] FindUserDetails...`);

  const payload = {
    operationName: 'FindUserDetails',
    variables: {},
    query: `query FindUserDetails {\n  findUserDetails {\n    organizationId\n    organizationName\n  }\n}`,
  };

  const { body } = await gql(url, payload, orgSsid);
  const data = body.data?.findUserDetails;

  if (!data) throw new Error('FindUserDetails returned no data');

  logger.info(`[api] Org name: ${data.organizationName}`);
  return data;
}

/**
 * API 3 — findBillingCostByDate
 * Returns YTD cost for the org (current year Jan 1 → Dec 31).
 */
export async function findBillingCostByDate(url, orgSsid) {
  const year      = new Date().getFullYear();
  const startDate = `${year}-01-01`;
  const endDate   = `${year}-12-31`;

  logger.info(`[api] findBillingCostByDate: ${startDate} → ${endDate}`);

  const payload = {
    operationName: 'findBillingCostByDate',
    variables: { startDate, endDate },
    query: `query findBillingCostByDate($startDate: String!, $endDate: String!) {\n  findBillingCostByDate(startDate: $startDate, endDate: $endDate) {\n    cost\n    asOf\n  }\n}`,
  };

  const { body } = await gql(url, payload, orgSsid);
  const results  = body.data?.findBillingCostByDate ?? [];

  // Sum all cost entries (usually just one, but safe to sum)
  const totalCost = results.reduce((sum, r) => sum + (r.cost ?? 0), 0);
  const asOf      = results[0]?.asOf ?? null;

  logger.info(`[api] YTD cost: $${totalCost.toFixed(2)}`);
  return { totalCost, asOf, startDate, endDate };
}

/**
 * API 4 — InsightsPriority
 * Returns total potential savings summed across all priorities × 12 = annualised.
 */
export async function fetchInsightsPriority(url, orgSsid) {
  logger.info(`[api] InsightsPriority...`);

  const payload = {
    operationName: 'InsightsPriority',
    variables: {
      insightInput: {
        provider: [],
        resourceType: [],
        priority: [],
        accountId: [],
        savingsRange: { param1: 0, param2: 0, operator: 'Greater than' },
        serviceName: [],
        searchString: '',
        perspective: [{ tagKey: null, tagValues: [] }],
        cloudgovPriority: false,
      },
    },
    query: `query InsightsPriority($insightInput: InsightInput!) {\n  insightsPriority(insightInput: $insightInput) {\n    priority\n    count\n    savings\n  }\n}`,
  };

  const { body } = await gql(url, payload, orgSsid);
  const items    = body.data?.insightsPriority ?? [];

  const breakdown = items.map(i => ({
    priority: i.priority,
    count:    i.count,
    savings:  i.savings,
  }));

  const totalMonthlySavings    = breakdown.reduce((sum, i) => sum + (i.savings ?? 0), 0);
  const annualisedSavings      = totalMonthlySavings * 12;

  logger.info(`[api] Insights monthly savings: $${totalMonthlySavings.toFixed(2)} | annualised: $${annualisedSavings.toFixed(2)}`);
  return { breakdown, totalMonthlySavings, annualisedSavings };
}

/**
 * API 5 — FindAllInstanceSchedule (Elasticity Agent)
 * Returns sum of potentialMonthlySavings and annualised version.
 */
export async function fetchElasticityAgentSavings(url, orgSsid) {
  logger.info(`[api] FindAllInstanceSchedule (ELASTICITY_AGENT)...`);

  const payload = {
    operationName: 'FindAllInstanceSchedule',
    variables: { instanceScheduleType: 'ELASTICITY_AGENT' },
    query: `query FindAllInstanceSchedule($instanceScheduleType: InstanceScheduleType) {\n  findAllInstanceSchedule(instanceScheduleType: $instanceScheduleType) {\n    potentialMonthlySavings\n  }\n}`,
  };

  const { body }   = await gql(url, payload, orgSsid);
  const items      = body.data?.findAllInstanceSchedule ?? [];

  const totalMonthlySavings = items.reduce((sum, i) => sum + (i.potentialMonthlySavings ?? 0), 0);
  const annualisedSavings   = totalMonthlySavings * 12;

  logger.info(`[api] Elasticity agent monthly savings: $${totalMonthlySavings.toFixed(2)} | annualised: $${annualisedSavings.toFixed(2)}`);
  return { instanceCount: items.length, totalMonthlySavings, annualisedSavings };
}
