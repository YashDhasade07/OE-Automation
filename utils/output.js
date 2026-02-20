// utils/output.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../logger/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(__dirname, '../output');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

export function saveJSON(taskName, data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${taskName}_${timestamp}.json`;
  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  logger.info(`[output] Saved ${data.length} records → output/${filename}`);
  return filepath;
}

export function saveReport(taskName, content) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${taskName}_report_${timestamp}.txt`;
  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, content);
  logger.info(`[output] Report saved → output/${filename}`);
  return filepath;
}

// Phase 3: Excel writing will be added here as writeExcel(taskName, data)
