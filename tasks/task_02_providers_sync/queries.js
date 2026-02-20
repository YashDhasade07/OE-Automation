// tasks/task_02_providers_sync/queries.js

const ORG_COLLECTION = 'organizations';
const ORG_NAME_FIELD = 'name';
const ONE_WEEK_MS    = 7 * 24 * 60 * 60 * 1000;

export function buildProvidersSyncQuery(ignoreOrgIds) {
  const oneWeekAgo = new Date(Date.now() - ONE_WEEK_MS);

  // Base $match — ignoreOrgIds can be empty array (no exclusions)
  const matchStage = {
    deletedFlag: false,
    activeFlag: true,
    syncFlagForReportConnection: true,
    lastProcessedTime: { $gte: oneWeekAgo },   // ← within last 7 days only
  };

  // Only add $nin if there are IDs to ignore
  if (ignoreOrgIds.length > 0) {
    matchStage.organizationId = { $nin: ignoreOrgIds };  // ← exclude these orgs
  }

  return {
    type: 'aggregate',
    collection: 'providers',
    pipeline: [
      // Stage 1: filter providers
      { $match: matchStage },

      // Stage 2: lookup organization
      {
        $lookup: {
          from: ORG_COLLECTION,
          let: { orgId: '$organizationId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: [{ $toString: '$_id' }, '$$orgId'],
                },
              },
            },
            {
              $project: {
                _id: 0,
                [ORG_NAME_FIELD]: 1,
                deletedFlag: 1,
                activeFlag: 1,
              },
            },
          ],
          as: 'organization',
        },
      },

      // Stage 3: drop providers with no matching org
      {
        $unwind: {
          path: '$organization',
          preserveNullAndEmptyArrays: false,
        },
      },

      // Stage 4: filter by organization's own flags
      {
        $match: {
          'organization.deletedFlag': false,
          'organization.activeFlag': true,
        },
      },

      // Stage 5: shape output — promote org name to top level
      {
        $project: {
          _id: 1,
          organizationId: 1,
          organizationName: `$organization.${ORG_NAME_FIELD}`,
          cloudProvider: 1,
          accountName: 1,
          accountNumber: 1,
          region: 1,
          lastProcessedTime: 1,
          isProcessed: 1,
          syncFlagForReportConnection: 1,
          validationConnectionStatus: 1,
        },
      },

      // Stage 6: oldest first
      { $sort: { lastProcessedTime: 1 } },
    ],
  };
}
