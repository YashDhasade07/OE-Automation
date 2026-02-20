// tasks/task_03_user_tracking/queries.js

const ORG_COLLECTION = 'organizations';
const ORG_NAME_FIELD = 'name';

export function buildUserTrackingQuery(orgIds, ignoreEmails) {
  // Today's date range: midnight → now
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const now = new Date();

  const matchStage = {
    organizationId: { $in: orgIds },
    createdDate: { $gte: todayStart, $lte: now },
  };

  // Only add $nin if there are emails to ignore
  if (ignoreEmails.length > 0) {
    matchStage.email = { $nin: ignoreEmails };
  }

  return {
    type: 'aggregate',
    collection: 'user-tracking',
    pipeline: [
      // Stage 1: filter by org IDs, today's date, ignored emails
      { $match: matchStage },

      // Stage 2: lookup organization name
      {
        $lookup: {
          from: ORG_COLLECTION,
          let: { orgId: '$organizationId' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: [{ $toString: '$_id' }, '$$orgId'] },
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

      // Stage 3: drop docs with no matching org
      {
        $unwind: {
          path: '$organization',
          preserveNullAndEmptyArrays: false,
        },
      },

      // Stage 4: only active orgs
      {
        $match: {
          'organization.deletedFlag': false,
          'organization.activeFlag': true,
        },
      },

      // Stage 5: group by organizationId — count total + sign-ins
      {
        $group: {
          _id: '$organizationId',
          organizationName: { $first: `$organization.${ORG_NAME_FIELD}` },
          totalActivity: { $sum: 1 },
          signInCount: {
            $sum: { $cond: [{ $eq: ['$action', 'SIGN_IN'] }, 1, 0] },
          },
          // Unique users who signed in today
          signInUsers: {
            $addToSet: {
              $cond: [
                { $eq: ['$action', 'SIGN_IN'] },
                '$email',
                '$$REMOVE',
              ],
            },
          },
        },
      },

      // Stage 6: shape final output
      {
        $project: {
          _id: 0,
          organizationId: '$_id',
          organizationName: 1,
          totalActivity: 1,
          signInCount: 1,
          uniqueSignInUsers: { $size: '$signInUsers' },
          signInUsers: 1,
        },
      },

      // Stage 7: sort by org name
      { $sort: { organizationName: 1 } },
    ],
  };
}
