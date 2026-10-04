import { JobStatus } from '@prisma/client';

const validTransitions: Record<JobStatus, JobStatus[]> = {
  ASSIGNED: ['ACCEPTED', 'REJECTED'],
  ACCEPTED: ['ON_THE_WAY'],
  ON_THE_WAY: ['ARRIVED'],
  ARRIVED: ['STARTED'],
  STARTED: ['DIAGNOSIS'],
  DIAGNOSIS: ['IN_PROGRESS', 'QUOTATION_PENDING'],
  QUOTATION_PENDING: ['AWAITING_CUSTOMER_APPROVAL'],
  AWAITING_CUSTOMER_APPROVAL: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED'],
  REJECTED: [],
  COMPLETED: [],
  CANCELLED: []
};

export const isTransitionAllowed = (currentStatus: JobStatus, requestedStatus: JobStatus): boolean => {
  const allowed = validTransitions[currentStatus];
  if (!allowed) return false;
  return allowed.includes(requestedStatus);
};
