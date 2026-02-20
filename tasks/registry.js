// tasks/registry.js
import * as task01 from './task_01_providers/index.js';
import * as task02 from './task_02_providers_sync/index.js';
import * as task03 from './task_03_user_tracking/index.js';

const registry = {
  task_01_providers:      task01,
  task_02_providers_sync: task02,
  task_03_user_tracking:  task03,
};

export default registry;
