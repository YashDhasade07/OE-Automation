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
    ignoreEmails_task03: process.env.IGNORE_EMAILS_TASK03?.split(',').map(e => e.trim()) ?? [],
    aws: {
      us: { profile: process.env.AWS_PROFILE_US, region: 'us-east-1' },
      ap: { profile: process.env.AWS_PROFILE_AP, region: 'ap-south-1' },
    },
    billing: {
      apiUrl:    process.env.BILLING_API_URL,
      email:     process.env.BILLING_EMAIL,
      password:  process.env.BILLING_PASSWORD,
      accountId: process.env.BILLING_ACCOUNT_ID,
      services:  process.env.BILLING_SERVICES?.split('|').map(s => s.trim()) ?? [],
    },

    task05: {
      us: {
        apiUrl:   process.env.TASK05_API_URL_US,
        email:    process.env.TASK05_EMAIL_US,
        password: process.env.TASK05_PASSWORD_US,
        orgIds:   process.env.ORG_IDS_TASK05_US?.split(',').map(id => id.trim()) ?? [],
      },
      ap: {
        apiUrl:   process.env.TASK05_API_URL_AP,
        email:    process.env.TASK05_EMAIL_AP,
        password: process.env.TASK05_PASSWORD_AP,
        orgIds:   process.env.ORG_IDS_TASK05_AP?.split(',').map(id => id.trim()) ?? [],
      },
    },
    clickhouse: {
      us: {
        host:     process.env.CLICKHOUSE_HOST_US,
        username: process.env.CLICKHOUSE_USER_US,
        password: process.env.CLICKHOUSE_PASSWORD_US,
        database: process.env.CLICKHOUSE_DB_US ?? 'default',
      },
      ap: {
        host:     process.env.CLICKHOUSE_HOST_AP,
        username: process.env.CLICKHOUSE_USER_AP,
        password: process.env.CLICKHOUSE_PASSWORD_AP,
        database: process.env.CLICKHOUSE_DB_AP ?? 'default',
      },
    },
    task06: {
      orgIds: {
        us: process.env.ORG_IDS_TASK06_US?.split(',').map(id => id.trim()) ?? [],
        ap: process.env.ORG_IDS_TASK06_AP?.split(',').map(id => id.trim()) ?? [],
      },
    },

    // ── Customer Happiness ──────────────────────────────
    customerHappiness: {
      orgIds: {
        us: process.env.ORG_IDS_CUSTOMER_HAPPINESS_US?.split(',').map(id => id.trim()) ?? [],
        ap: process.env.ORG_IDS_CUSTOMER_HAPPINESS_AP?.split(',').map(id => id.trim()) ?? [],
      },
    },
  };
}
