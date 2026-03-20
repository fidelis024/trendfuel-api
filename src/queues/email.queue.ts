// queues/email.queue.ts
import { createQueue } from './queue.event';

export const emailQueue = createQueue('email');

emailQueue.process(async (job) => {
  // Process email jobs
  console.log('Processing email:', job.data);
});

export default emailQueue;
