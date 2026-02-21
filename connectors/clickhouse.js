// connectors/clickhouse.js
import { createClient } from '@clickhouse/client';
import { getConfig } from '../config/environments.js';
import logger from '../logger/index.js';

// { us: ClickHouseClient, ap: ClickHouseClient }
const clients = {};

export async function connect(region = 'us') {
  if (clients[region]) return clients[region];

  const { clickhouse } = getConfig();
  const cfg = clickhouse[region];

  if (!cfg?.host) {
    throw new Error(`CLICKHOUSE_HOST_${region.toUpperCase()} is not set in .env`);
  }

  const client = createClient({
    host:     cfg.host,
    username: cfg.username,
    password: cfg.password,
    database: cfg.database,
  });

  // Verify connection
  const alive = await client.ping();
  if (!alive) throw new Error(`[clickhouse:${region}] Ping failed — check credentials`);

  clients[region] = client;
  logger.info(`[clickhouse:${region}] Connected ✓`);
  return client;
}

export async function disconnectAll() {
  for (const [region, client] of Object.entries(clients)) {
    await client.close();
    delete clients[region];
    logger.info(`[clickhouse:${region}] Disconnected`);
  }
}

/**
 * Run a raw SQL query against a region.
 * Always returns an array of row objects.
 *
 * Usage:
 *   const rows = await runQuery('SELECT * FROM table WHERE id = {id:String}', { id: '123' }, 'us');
 */
export async function runQuery(sql, params = {}, region = 'us') {
  const client = await connect(region);

  logger.info(`[clickhouse:${region}] Query: ${sql}`);

  const result = await client.query({
    query:            sql,
    query_params:     params,
    format:           'JSONEachRow',
  });

  const rows = await result.json();
  logger.info(`[clickhouse:${region}] Returned ${rows.length} row(s)`);
  return rows;
}
