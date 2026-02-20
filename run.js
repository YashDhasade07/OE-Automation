// run.js
import 'dotenv/config';   // ← must be first import
import minimist from 'minimist';
import registry from './tasks/registry.js';
import { disconnectAll } from './connectors/mongo.js';
import logger from './logger/index.js';

const args = minimist(process.argv.slice(2));

async function runTask(name) {
  const task = registry[name];
  if (!task) {
    logger.error(`Unknown task: "${name}". Available: ${Object.keys(registry).join(', ')}`);
    process.exit(1);
  }
  await task.run();
}

async function main() {
  try {
    if (args.all) {
      logger.info(`Running all ${Object.keys(registry).length} task(s)...`);
      for (const name of Object.keys(registry)) {
        await runTask(name);
      }
    } else if (args.task) {
      await runTask(args.task);
    } else {
      logger.error('Usage:  node run.js --task <task_name>');
      logger.error('        node run.js --all');
      logger.error(`Tasks:  ${Object.keys(registry).join(', ')}`);
      process.exit(1);
    }
  } catch (err) {
    logger.error(`Fatal: ${err.message}`);
    process.exit(1);
  } finally {
    await disconnectAll();
  }
}

main();
