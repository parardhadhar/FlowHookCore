import { Queue } from 'bullmq';

const connection = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
};

export const actionQueue = new Queue('action-queue', {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 2000, // 2s base → 4s → 8s → 16s → 32s
    },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 500 },
  },
});

export { connection as redisConnection };
