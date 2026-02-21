// tasks/task_04_billing/queries.js

// Shared GraphQL query string — same for all billing requests
const BILLING_QUERY = `query findBillingDetails($billingSearchCriteria: BillingSearchCriteria!) {\n  findBillingDetails(billingSearchCriteria: $billingSearchCriteria) {\n    billingItemResponse {\n      payerAccountId\n      unblendedCost\n      usagesStartDate\n    }\n  }\n}`;

/**
 * Returns today's date and 4 days ago as YYYY-MM-DD strings.
 */
export function getDateRange() {
  const end   = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 4);

  const fmt = (d) => d.toISOString().slice(0, 10);
  return { startDate: fmt(start), endDate: fmt(end) };
}

/**
 * Builds payload for a single service.
 * Used in the per-service loop.
 */
export function buildServicePayload(serviceName, accountId, startDate, endDate) {
  return {
    operationName: 'findBillingDetails',
    variables: {
      billingSearchCriteria: {
        billingGroupByType: 'BILLING_ACCOUNT_BY_DAILY',
        mvToken: 1,
        routeName: 'DEEP_DIVE_COST',
        billingFilter: {
          ProviderTypeList: null,
          billingAccountList: [accountId],
          usagesAccountList: null,
          serviceNameList: [serviceName],   // ← single service
          regionList: null,
          chargeTypeList: ['Credit'],
          categoryList: null,
          startDate,
          usageTypeDetailed: null,
          customizeTable: false,
          endDate,
          resourceGroupList: null,
          enrollmentAccountList: null,
          tagFilterType: 'ALL_RESOURCES',
          perspective: null,
          excludeFilterList: ['CHARGE_TYPE'],   // ← SERVICE not excluded here
        },
        perspectiveId: null,
      },
    },
    query: BILLING_QUERY,
  };
}

/**
 * Builds payload for the final total query.
 * All services passed in serviceNameList, SERVICE added to excludeFilterList
 * so result is the total EXCLUDING all those services.
 */
export function buildTotalPayload(services, accountId, startDate, endDate) {
  return {
    operationName: 'findBillingDetails',
    variables: {
      billingSearchCriteria: {
        billingGroupByType: 'BILLING_ACCOUNT_BY_DAILY',
        mvToken: 1,
        routeName: 'DEEP_DIVE_COST',
        billingFilter: {
          ProviderTypeList: null,
          billingAccountList: [accountId],
          usagesAccountList: null,
          serviceNameList: services,          // ← all services
          regionList: null,
          chargeTypeList: ['Credit'],
          categoryList: null,
          startDate,
          usageTypeDetailed: null,
          customizeTable: false,
          endDate,
          resourceGroupList: null,
          enrollmentAccountList: null,
          tagFilterType: 'ALL_RESOURCES',
          perspective: null,
          excludeFilterList: ['CHARGE_TYPE', 'SERVICE'],  // ← SERVICE excluded = total minus those services
        },
        perspectiveId: null,
      },
    },
    query: BILLING_QUERY,
  };
}
