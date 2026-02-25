# OE Automation

A Node.js automation tool that fetches and logs monitoring data from
MongoDB, ClickHouse, and internal APIs across two production environments
(US and Asia-Pacific) for daily operational reporting.

> ⚠️ This tool is **READ-ONLY**. It never writes, updates, or deletes
> anything in any database.

---

## Requirements

- Node.js 18+
- npm

---

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create your `.env` file**
   ```bash
   cp .env.example .env
   ```
   Fill in all values. Ask your team lead for credentials.

3. **Run a single task**
   ```bash
   node run.js --task <task_name>
   ```

4. **Run all tasks**
   ```bash
   node run.js --all
   ```

---

## Environments

Every task that uses a database runs against **both regions automatically**
unless that region has no org IDs configured in `.env`.

| Key  | Region          | MongoDB        | ClickHouse           |
|------|-----------------|----------------|----------------------|
| `us` | US East-1       | `MONGO_URI_US` | `CLICKHOUSE_HOST_US` |
| `ap` | Mumbai (AP)     | `MONGO_URI_AP` | `CLICKHOUSE_HOST_AP` |

---

## Output

Every run produces files inside the `output/` folder (auto-created, gitignored):

| File                                     | What it contains                           |
|------------------------------------------|--------------------------------------------|
| `run.log`                                | Full log of every run, appended each time  |
| `<task>_<region>_<timestamp>.json`       | Raw fetched data (for programmatic use)    |
| `<task>_<region>_report_<timestamp>.txt` | Human-readable report — open this one     |

> `output/` is gitignored — it contains production data, never commit it.

---

## Tasks

### `task_01_providers`
```bash
node run.js --task task_01_providers
```

**What it does:**
Fetches all cloud provider accounts (AWS, Azure, GCP) belonging to a
specific list of organizations and checks how recently each account
was last processed/synced by the platform.

**Why it matters:**
If a provider account hasn't been processed recently, cost data for
that account may be stale or missing in the platform.

**Staleness thresholds:**
| Status      | Meaning                                          |
|-------------|--------------------------------------------------|
| ✅ OK        | Processed less than 1.5 days ago — healthy       |
| ⚠️ WARNING   | Not processed for 1.5–3 days — worth checking   |
| 🚨 CRITICAL  | Not processed for 3+ days — needs attention     |
| ❓ UNKNOWN   | No `lastProcessedTime` recorded at all           |

**Configure in `.env`:**
```env
ORG_IDS_TASK01_US=id1,id2,id3
ORG_IDS_TASK01_AP=id1,id2
```

---

### `task_02_providers_sync`
```bash
node run.js --task task_02_providers_sync
```

**What it does:**
Fetches provider accounts that have `syncFlagForReportConnection`
enabled and were last processed **within the last 7 days**. Excludes
specified organizations. Also cross-checks that the organization
itself is still active before including a provider.

**Why it matters:**
These are providers actively syncing report data. Falling behind
while sync is enabled means report data is going stale silently.

**Staleness thresholds:** Same as Task 01 (1.5 / 3 days).

**Configure in `.env`:**
```env
# Org IDs to EXCLUDE from this check
IGNORE_ORG_IDS_TASK02_US=id1,id2
IGNORE_ORG_IDS_TASK02_AP=id1,id2
```

---

### `task_03_user_tracking`
```bash
node run.js --task task_03_user_tracking
```

**What it does:**
Looks at the `user-tracking` collection and reports on **today's
user activity** for a given list of organizations. Shows:
- How many unique users signed in today
- Total number of all platform actions today
- Which organizations had zero activity today

Specific emails (e.g. internal/system accounts) can be excluded.

**Why it matters:**
Gives a daily snapshot of which organizations are actively using
the platform and which ones have gone quiet.

**Configure in `.env`:**
```env
ORG_IDS_TASK03_US=id1,id2
ORG_IDS_TASK03_AP=id1,id2
# Emails to exclude — same for both regions
IGNORE_EMAILS_TASK03=admin@example.com,system@example.com
```

---

### `task_04_billing`
```bash
node run.js --task task_04_billing
```

**What it does:**
Logs into the billing platform and fetches **daily cost data** for
each configured AWS service over the last 4 days. Then runs one
final query to get the **total billing account cost excluding those
services** (i.e. the remainder).

**Data returned per service:** Cost per day for the last 4–5 days.

**Final total query:** Daily cost of the entire billing account
with all tracked services excluded.

**Configure in `.env`:**
```env
BILLING_API_URL=https://your-app.com/graphql
BILLING_EMAIL=user@example.com
BILLING_PASSWORD=yourpassword
BILLING_ACCOUNT_ID=309492466669
# Pipe-separated — service names can contain commas
BILLING_SERVICES=Amazon Elastic Compute Cloud|Amazon Elastic Container Service|AmazonCloudWatch
```

---

### `task_05_org_summary`
```bash
node run.js --task task_05_org_summary
```

**What it does:**
Logs in as an **admin account**, then for each configured organization:
1. Assumes the org's role (gets an org-scoped session)
2. Fetches the **YTD cloud cost** for the current year
3. Fetches **insights potential savings** (monthly × 12 = annualised)
4. Fetches **Elasticity Agent scheduled instance savings** (monthly + annualised)

**Why it matters:**
Gives a financial health snapshot per organization — how much they've
spent this year and how much they could save.

**Configure in `.env`:**
```env
# Separate credentials per region
TASK05_API_URL_US=https://us-app.cloudgov.com/graphql
TASK05_EMAIL_US=admin-us@cloudgov.com
TASK05_PASSWORD_US=password
ORG_IDS_TASK05_US=id1,id2

TASK05_API_URL_AP=https://ap-app.cloudgov.com/graphql
TASK05_EMAIL_AP=admin-ap@cloudgov.com
TASK05_PASSWORD_AP=password
ORG_IDS_TASK05_AP=id3,id4
```

---

### `task_06_anomaly_health`
```bash
node run.js --task task_06_anomaly_health
```

**What it does:**
Queries ClickHouse for each configured organization and runs two checks:

1. **Anomaly Job Check** — Was the anomaly detection job run within
   the last 24 hours? Checks `MAX(lastmodifieddate)` in the
   `anomalies_test` table.

2. **Policy Insights Check** — Are there any policy insights recorded
   within the last 7 days? Checks `count(*)` in the `policy_insights_`
   table.

**Why it matters:**
Confirms that backend anomaly and insight generation jobs are running
on schedule. A gap means customers are not receiving fresh recommendations.

**Flags:**
| Status      | Meaning                                             |
|-------------|-----------------------------------------------------|
| ✅ OK        | Anomaly job ran within 24h / insights exist         |
| 🚨 FLAGGED   | Job hasn't run in 24h+ / no insights in 7 days     |

**Configure in `.env`:**
```env
ORG_IDS_TASK06_US=id1,id2
ORG_IDS_TASK06_AP=id1,id2

CLICKHOUSE_HOST_US=https://abc123.us-east-1.aws.clickhouse.cloud:8443
CLICKHOUSE_USER_US=default
CLICKHOUSE_PASSWORD_US=yourpassword
CLICKHOUSE_DB_US=default

CLICKHOUSE_HOST_AP=https://xyz789.ap-south-1.aws.clickhouse.cloud:8443
CLICKHOUSE_USER_AP=default
CLICKHOUSE_PASSWORD_AP=yourpassword
CLICKHOUSE_DB_AP=default
```

---

### `task_customer_happiness` ⭐ Main Daily Task
```bash
node run.js --task task_customer_happiness
```

**What it does:**
This is the **master daily task**. It combines data from all the above
tasks into one unified report per organization — formatted so values
can be copied directly into the **Customer Happiness** Excel sheet
without needing to know which system each value came from.

For each configured organization it fetches and reports:

| Sheet Field               | Source        | Logic                                               |
|---------------------------|---------------|-----------------------------------------------------|
| AWS CUR Ingest            | MongoDB       | Pass if ALL AWS accounts processed within 1.5 days  |
| Azure CUR Ingest          | MongoDB       | Pass if ALL Azure accounts processed within 1.5 days|
| GCP CUR Ingest            | MongoDB       | Pass if ALL GCP accounts processed within 1.5 days  |
| Anomaly Run               | ClickHouse    | Pass if anomaly job ran within last 24 hours        |
| Insights                  | ClickHouse    | Pass if policy insights count > 0 in last 7 days   |
| Account Refresh           | MongoDB       | Pass if ALL accounts (any provider) within 1.5 days |
| Current YTD               | API (Task 05) | Total cloud spend Jan 1 → Dec 31                   |
| Annualised Insight Found  | API (Task 05) | Sum of all insight savings × 12                    |
| Elasticity Agent Savings  | API (Task 05) | Monthly elasticity agent scheduled savings          |
| Number of Users Logged In | MongoDB       | Unique users who signed in today                    |
| Number of Activities      | MongoDB       | Total platform actions recorded today               |

**How failures are handled:**
Each data source (MongoDB, ClickHouse, API) fetches independently in
parallel. If one source fails (e.g. ClickHouse is down), the rest of
the data still shows correctly. Failed fields display `ERR` in the
sheet values section and show the exact error message in the detail
section so you know exactly what to investigate.

**Report structure per org:**
```
SHEET VALUES  ← copy these directly into the Excel sheet
DETAIL        ← per-account breakdown, review if anything shows Fail
```

**Configure in `.env`:**
```env
# Uses the same Task 05 credentials for financials
# Uses IGNORE_EMAILS_TASK03 for user activity filtering
ORG_IDS_CUSTOMER_HAPPINESS_US=id1,id2
ORG_IDS_CUSTOMER_HAPPINESS_AP=id3,id4
```

---

## Adding a New Task

1. Create folder: `tasks/task_XX_your_task/`
2. Add these three files inside it:
   - `queries.js` — query/payload definitions
   - `report.js` — human-readable report builder
   - `index.js` — task runner (copy structure from any existing task)
3. Register it in `tasks/registry.js`:
   ```js
   import * as task07 from './task_07_your_task/index.js';

   const registry = {
     ...existing tasks,
     task_07_your_task: task07,
   };
   ```
4. Add any new env vars to both `.env` and `.env.example`
5. Document it in this README under the Tasks section

---

## Project Structure

```
automation/
├── auth/
│   └── login.js                     # Reusable login — returns ssid cookie
├── config/
│   └── environments.js              # All env vars in one place (lazy read)
├── connectors/
│   ├── mongo.js                     # MongoDB — multi-region client pool
│   └── clickhouse.js                # ClickHouse Cloud — HTTPS connection
├── tasks/
│   ├── registry.js                  # Master list of all tasks
│   ├── task_01_providers/
│   │   ├── index.js
│   │   ├── queries.js
│   │   └── report.js
│   ├── task_02_providers_sync/
│   │   ├── index.js
│   │   ├── queries.js
│   │   └── report.js
│   ├── task_03_user_tracking/
│   │   ├── index.js
│   │   ├── queries.js
│   │   └── report.js
│   ├── task_04_billing/
│   │   ├── index.js
│   │   ├── queries.js
│   │   ├── api.js
│   │   └── report.js
│   ├── task_05_org_summary/
│   │   ├── index.js
│   │   ├── api.js
│   │   └── report.js
│   ├── task_06_anomaly_health/
│   │   ├── index.js
│   │   ├── queries.js
│   │   └── report.js
│   └── task_customer_happiness/     # ← Master daily report task
│       ├── index.js
│       ├── fetchers.js
│       └── report.js
├── logger/
│   └── index.js                     # Winston — console + file logging
├── utils/
│   └── output.js                    # saveJSON() and saveReport()
├── output/                          # ← gitignored, all run output here
├── run.js                           # CLI entry point
├── .env                             # ← gitignored, fill from .env.example
├── .env.example                     # Safe to commit, no real values
└── package.json
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `MONGO_URI_US is not set` | Check your `.env` has the URI filled in |
| `total providers: 0` | Wrong DB name — should be `cloudgov` for both regions |
| `Cannot use a session that has ended` | MongoDB cursor issue — ensure `cursor.close()` is in `finally` blocks in `connectors/mongo.js` |
| `Login succeeded but no ssid cookie` | API not setting `Set-Cookie` — verify the API URL is correct |
| `AssumeRoleForMSP returned false` | Org ID is wrong or admin account lacks MSP access to that org |
| ClickHouse `ping failed` | Check `CLICKHOUSE_HOST_*`, `CLICKHOUSE_USER_*`, `CLICKHOUSE_PASSWORD_*` in `.env` |
| `Find returned 0 documents` | Wrong DB name or org IDs not matching — verify env vars |
| Task not found | Check spelling exactly matches the key in `tasks/registry.js` |
| Field shows `ERR` in customer happiness report | One data source failed — check `output/run.log` for the error on that org |

---

## Full `.env` Reference

```env
# ── MongoDB ────────────────────────────────────────
MONGO_URI_US=mongodb+srv://user:pass@cluster-us.mongodb.net
MONGO_DB_NAME_US=cloudgov
MONGO_URI_AP=mongodb+srv://user:pass@cluster-ap.mongodb.net
MONGO_DB_NAME_AP=cloudgov

# ── ClickHouse ─────────────────────────────────────
CLICKHOUSE_HOST_US=https://abc.us-east-1.aws.clickhouse.cloud:8443
CLICKHOUSE_USER_US=default
CLICKHOUSE_PASSWORD_US=
CLICKHOUSE_DB_US=default
CLICKHOUSE_HOST_AP=https://xyz.ap-south-1.aws.clickhouse.cloud:8443
CLICKHOUSE_USER_AP=default
CLICKHOUSE_PASSWORD_AP=
CLICKHOUSE_DB_AP=default

# ── Task 01 ────────────────────────────────────────
ORG_IDS_TASK01_US=
ORG_IDS_TASK01_AP=

# ── Task 02 ────────────────────────────────────────
IGNORE_ORG_IDS_TASK02_US=
IGNORE_ORG_IDS_TASK02_AP=

# ── Task 03 ────────────────────────────────────────
ORG_IDS_TASK03_US=
ORG_IDS_TASK03_AP=
IGNORE_EMAILS_TASK03=

# ── Task 04 ────────────────────────────────────────
BILLING_API_URL=
BILLING_EMAIL=
BILLING_PASSWORD=
BILLING_ACCOUNT_ID=
BILLING_SERVICES=

# ── Task 05 ────────────────────────────────────────
TASK05_API_URL_US=
TASK05_EMAIL_US=
TASK05_PASSWORD_US=
ORG_IDS_TASK05_US=
TASK05_API_URL_AP=
TASK05_EMAIL_AP=
TASK05_PASSWORD_AP=
ORG_IDS_TASK05_AP=

# ── Task 06 ────────────────────────────────────────
ORG_IDS_TASK06_US=
ORG_IDS_TASK06_AP=

# ── Customer Happiness ─────────────────────────────
ORG_IDS_CUSTOMER_HAPPINESS_US=
ORG_IDS_CUSTOMER_HAPPINESS_AP=
```
