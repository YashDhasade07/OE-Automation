// config/environments.js

export function getConfig() {
    return {
      mongo: {
        us: {
          uri: process.env.MONGO_URI_US,
          dbName: process.env.MONGO_DB_NAME_US,
          // Task 01: fetch providers FOR these org IDs
          orgIds_task01: process.env.ORG_IDS_TASK01_US?.split(',').map(id => id.trim()) ?? [],
          // Task 02: IGNORE providers belonging to these org IDs
          ignoreOrgIds_task02: process.env.IGNORE_ORG_IDS_TASK02_US?.split(',').map(id => id.trim()) ?? [],
        },
        ap: {
          uri: process.env.MONGO_URI_AP,
          dbName: process.env.MONGO_DB_NAME_AP,
          // Task 01
          orgIds_task01: process.env.ORG_IDS_TASK01_AP?.split(',').map(id => id.trim()) ?? [],
          // Task 02
          ignoreOrgIds_task02: process.env.IGNORE_ORG_IDS_TASK02_AP?.split(',').map(id => id.trim()) ?? [],
        },
      },
      aws: {
        us: { profile: process.env.AWS_PROFILE_US, region: 'us-east-1' },
        ap: { profile: process.env.AWS_PROFILE_AP, region: 'ap-south-1' },
      },
    };
  }
  