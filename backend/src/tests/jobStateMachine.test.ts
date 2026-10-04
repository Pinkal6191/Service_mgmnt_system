import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { JobStatus } from '@prisma/client';
import { isTransitionAllowed } from '../services/jobStateMachine';

describe('Job State Machine', () => {
  describe('Valid Transitions', () => {
    const validTransitions = [
      { from: 'ASSIGNED', to: 'ACCEPTED' },
      { from: 'ASSIGNED', to: 'REJECTED' },
      { from: 'ACCEPTED', to: 'ON_THE_WAY' },
      { from: 'ON_THE_WAY', to: 'ARRIVED' },
      { from: 'ARRIVED', to: 'STARTED' },
      { from: 'STARTED', to: 'DIAGNOSIS' },
      { from: 'DIAGNOSIS', to: 'IN_PROGRESS' },
      { from: 'DIAGNOSIS', to: 'QUOTATION_PENDING' },
      { from: 'QUOTATION_PENDING', to: 'AWAITING_CUSTOMER_APPROVAL' },
      { from: 'AWAITING_CUSTOMER_APPROVAL', to: 'IN_PROGRESS' },
      { from: 'AWAITING_CUSTOMER_APPROVAL', to: 'CANCELLED' },
      { from: 'IN_PROGRESS', to: 'COMPLETED' },
    ];

    validTransitions.forEach(({ from, to }) => {
      it(`should allow transition from ${from} to ${to}`, () => {
        assert.strictEqual(isTransitionAllowed(from as JobStatus, to as JobStatus), true);
      });
    });
  });

  describe('Invalid Transitions', () => {
    const invalidTransitions = [
      { from: 'ASSIGNED', to: 'COMPLETED' },
      { from: 'ASSIGNED', to: 'STARTED' },
      { from: 'ACCEPTED', to: 'COMPLETED' },
      { from: 'ON_THE_WAY', to: 'IN_PROGRESS' },
      { from: 'ARRIVED', to: 'COMPLETED' },
      { from: 'STARTED', to: 'COMPLETED' },
      { from: 'COMPLETED', to: 'IN_PROGRESS' },
      { from: 'COMPLETED', to: 'CANCELLED' },
      { from: 'REJECTED', to: 'ACCEPTED' },
      { from: 'CANCELLED', to: 'IN_PROGRESS' },
      // Same status tests
      { from: 'ASSIGNED', to: 'ASSIGNED' },
      { from: 'COMPLETED', to: 'COMPLETED' },
    ];

    invalidTransitions.forEach(({ from, to }) => {
      it(`should reject transition from ${from} to ${to}`, () => {
        assert.strictEqual(isTransitionAllowed(from as JobStatus, to as JobStatus), false);
      });
    });
  });

  describe('Terminal States', () => {
    const terminalStates: JobStatus[] = ['REJECTED', 'COMPLETED', 'CANCELLED'];
    const allStatuses: JobStatus[] = [
      'ASSIGNED', 'ACCEPTED', 'REJECTED', 'ON_THE_WAY', 'ARRIVED', 
      'STARTED', 'DIAGNOSIS', 'QUOTATION_PENDING', 'AWAITING_CUSTOMER_APPROVAL', 
      'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
    ];

    terminalStates.forEach(terminal => {
      allStatuses.forEach(target => {
        it(`should reject any transition from terminal state ${terminal} to ${target}`, () => {
          assert.strictEqual(isTransitionAllowed(terminal, target), false);
        });
      });
    });
  });
});
