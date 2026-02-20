// config/environments.js

export function getConfig() {
    return {
      mongo: {
        us: {
          uri: process.env.MONGO_URI_US,
          dbName: process.env.MONGO_DB_NAME_US,
          orgIds_task01: process.env.ORG_IDS_TASK01_US?.split(',').map(id => id.trim()) ?? [],
          ignoreOrgIds_task02: process.env.IGNORE_ORG_IDS_TASK02_US?.split(',').map(id => id.trim()) ?? [],
          orgIds_task03: process.env.ORG_IDS_TASK03_US?.split(',').map(id => id.trim()) ?? [],
        },
        ap: {
          uri: process.env.MONGO_URI_AP,
          dbName: process.env.MONGO_DB_NAME_AP,
          orgIds_task01: process.env.ORG_IDS_TASK01_AP?.split(',').map(id => id.trim()) ?? [],
          ignoreOrgIds_task02: process.env.IGNORE_ORG_IDS_TASK02_AP?.split(',').map(id => id.trim()) ?? [],
          orgIds_task03: process.env.ORG_IDS_TASK03_AP?.split(',').map(id => id.trim()) ?? [],
        },
      },
      // Ignore emails are same for both regions
      ignoreEmails_task03: process.env.IGNORE_EMAILS_TASK03?.split(',').map(e => e.trim()) ?? [],
      aws: {
        us: { profile: process.env.AWS_PROFILE_US, region: 'us-east-1' },
        ap: { profile: process.env.AWS_PROFILE_AP, region: 'ap-south-1' },
      },
    };
  }
