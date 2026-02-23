// tasks/registry.js
import * as task01 from './task_01_providers/index.js';
import * as task02 from './task_02_providers_sync/index.js';
import * as task03 from './task_03_user_tracking/index.js';
import * as task04 from './task_04_billing/index.js';
import * as task05 from './task_05_org_summary/index.js';
import * as task06 from './task_06_anomaly_health/index.js';
import * as taskCH from './task_customer_happiness/index.js';

const registry = {
  task_01_providers:        task01,
  task_02_providers_sync:   task02,
  task_03_user_tracking:    task03,
  task_04_billing:          task04,
  task_05_org_summary:      task05,
  task_06_anomaly_health:   task06,
  task_customer_happiness:  taskCH,
};

export default registry;
