// connectors/mongo.js
import { MongoClient } from 'mongodb';
import { getConfig } from '../config/environments.js';
import logger from '../logger/index.js';

const clients = {};

/**
 * Get (or create) MongoClient for a region.
 */
export async function connect(region = 'us') {
  if (clients[region]) return clients[region];

  const { mongo } = getConfig();
  const { uri } = mongo[region];

  if (!uri) {
    throw new Error(`MONGO_URI_${region.toUpperCase()} is not set in .env`);
  }

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });

  await client.connect();
  clients[region] = client;
  logger.info(`[mongo:${region}] Connected`);
  return client;
}

/**
 * Close all region clients.
 */
export async function disconnectAll() {
  for (const [region, client] of Object.entries(clients)) {
    try {
      await client.close();
      logger.info(`[mongo:${region}] Disconnected`);
    } catch (err) {
      logger.error(`[mongo:${region}] Error while disconnecting: ${err.message}`);
    } finally {
      delete clients[region];
    }
  }
}

/**
 * Run a query definition against a given region.
 * Supports:
 *  - { type: 'find', collection, filter, project, sort, limit }
 *  - { type: 'aggregate', collection, pipeline }
 */
export async function runQuery(queryDef, region = 'us') {
  const { mongo } = getConfig();
  const client = await connect(region);
  const db = client.db(mongo[region].dbName);
  const col = db.collection(queryDef.collection);

  // Debug: log the query being sent
//   logger.info(
//     `[mongo:${region}] Running ${queryDef.type ?? 'find'} on "${queryDef.collection}" with filter: ` +
//     JSON.stringify(queryDef.filter ?? {}, null, 2)
//   );

  if (queryDef.type === 'aggregate') {
    const cursor = col.aggregate(queryDef.pipeline);
    try {
      const result = await cursor.toArray();
      logger.info(`[mongo:${region}] Aggregate returned ${result.length} document(s)`);
      return result;
    } finally {
      await cursor.close();
    }
  }

  let cursor = col.find(queryDef.filter ?? {});
  if (queryDef.project) cursor = cursor.project(queryDef.project);
  if (queryDef.sort)    cursor = cursor.sort(queryDef.sort);
  if (queryDef.limit)   cursor = cursor.limit(queryDef.limit);

  try {
    const result = await cursor.toArray();
    logger.info(`[mongo:${region}] Find returned ${result.length} document(s)`);
    return result;
  } finally {
    await cursor.close();
  }
}
