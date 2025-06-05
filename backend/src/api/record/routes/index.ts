/**
 * Индексный файл для роутов
 * Файл: backend/src/api/record/routes/index.ts
 */

import recordRoutes from './record';
import statisticsRoutes from './statistics';

export default {
  record: recordRoutes,
  statistics: statisticsRoutes,
};