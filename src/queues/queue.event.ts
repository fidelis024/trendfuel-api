// queues/queue.event.ts
import Bull from 'bull';

export const createQueue = (name: string) => {
  return new Bull(name, {
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: true,
    },
  });
};

export default createQueue;
