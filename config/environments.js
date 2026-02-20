// config/environments.js

export function getConfig() {
    return {
      mongo: {
        us: {
          uri: process.env.MONGO_URI_US,
          dbName: process.env.MONGO_DB_NAME_US,
          orgIds: process.env.ORG_IDS_US?.split(',').map(id => id.trim()) ?? [],
        },
        ap: {
          uri: process.env.MONGO_URI_AP,
          dbName: process.env.MONGO_DB_NAME_AP,
          orgIds: process.env.ORG_IDS_AP?.split(',').map(id => id.trim()) ?? [],
        },
      },
      aws: {
        us: { profile: process.env.AWS_PROFILE_US, region: 'us-east-1' },
        ap: { profile: process.env.AWS_PROFILE_AP, region: 'ap-south-1' },
      },
  
      // ← Phase 2: uncomment when ClickHouse is ready
      // clickhouse: {
      //   us: { host: process.env.CLICKHOUSE_HOST_US },
      //   ap: { host: process.env.CLICKHOUSE_HOST_AP },
      // },
    };
  }
