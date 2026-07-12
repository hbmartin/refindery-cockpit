import { z } from 'zod';

export const JOB_STATUSES = [
  'pending',
  'running',
  'done',
  'failed',
  'dead',
] as const;

/** Jobs lens filter. Absent `status` = the default dead/active split view. */
export const jobsSearchSchema = z.object({
  status: z.enum(JOB_STATUSES).optional().catch(undefined),
});

export type JobsSearch = z.output<typeof jobsSearchSchema>;
