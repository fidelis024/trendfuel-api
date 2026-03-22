import cron from 'node-cron';
import { autoCompleteExpiredOrders } from '../modules/orders/order.service';
import logger from './logger';

export const initCronJobs = () => {
  // Run every 30 minutes — check for delivered orders past auto-complete time
  cron.schedule('*/30 * * * *', async () => {
    logger.info('Cron: checking for expired orders to auto-complete...');
    try {
      const completed = await autoCompleteExpiredOrders();
      if (completed > 0) {
        logger.info(`Cron: auto-completed ${completed} order(s)`);
      }
    } catch (error) {
      logger.error('Cron: auto-complete job failed:', error);
    }
  });

  logger.info('Cron jobs initialized');
};
