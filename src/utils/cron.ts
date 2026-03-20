// utils/cron.ts
import cron from 'node-cron';
import logger from './logger';

export const setupCronJobs = () => {
  // Example: Release escrow at midnight daily
  cron.schedule('0 0 * * *', async () => {
    logger.info('Running scheduled escrow release job');
    // Logic here
  });
};

export default setupCronJobs;
