// tasks/registry.js
import * as task01 from './task_01_providers/index.js';

const registry = {
  task_01_providers: task01,
  // task_02_...: task02,   ← add new tasks here
};

export default registry;
