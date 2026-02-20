// tasks/task_01_providers/queries.js

export function buildProvidersQuery(orgIds) {
    return {
      type: 'find',
      collection: 'providers',
      filter: {
        organizationId: { $in: orgIds },
        deletedFlag: false,
        activeFlag: true,
      },
      project: {
        _id: 1,
        organizationId: 1,
        cloudProvider: 1,
        accountName: 1,
        accountNumber: 1,
        region: 1,
        lastProcessedTime: 1,
        isProcessed: 1,
        validationConnectionStatus: 1,
      },
      sort: { lastProcessedTime: 1 },
    };
  }
  