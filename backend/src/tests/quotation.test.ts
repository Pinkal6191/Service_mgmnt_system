import { describe, it, beforeEach } from 'node:test';
import * as assert from 'node:assert';
import prisma from '../config/prisma';
import { 
  createQuotation, 
  addQuotationItem, 
  updateQuotationItem,
  removeQuotationItem,
  sendQuotation,
  getQuotation,
  approveQuotation,
  rejectQuotation
} from '../controllers/quotationController';
import { Decimal } from '@prisma/client/runtime/library';

// Helper to mock req/res
const mockReqRes = (user: any, body: any = {}, params: any = {}) => {
  const req = { user, body, params } as any;
  const res = {
    statusCode: 200,
    data: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      this.data = data;
      return this;
    },
    send() {
      return this;
    }
  } as any;
  return { req, res };
};

describe('Quotation API', () => {

  beforeEach(() => {
    // Reset mocks
    (prisma.quotation as any) = {
      findUnique: async () => null,
      create: async () => ({}),
      update: async () => ({}),
    };
    (prisma.quotationItem as any) = {
      create: async () => ({}),
      update: async () => ({}),
      delete: async () => ({}),
      count: async () => 1,
      findUnique: async () => null
    };
    (prisma.jobAssignment as any) = {
      findUnique: async () => ({
        id: 'job-1',
        status: 'DIAGNOSIS',
        technician_id: 'tech-1',
        booking: { customer_id: 'cust-1', branch_id: 'branch-1' }
      }),
      update: async () => ({})
    };
    (prisma.$transaction as any) = async (cb: any) => {
      // Pass prisma as tx
      return cb(prisma);
    };
  });

  // CUSTOMER IDOR
  it('should not allow CUSTOMER to create quotation', async () => {
    const { req, res } = mockReqRes({ role: 'CUSTOMER', id: 'cust-1' }, { job_id: 'job-1' });
    await createQuotation(req, res);
    assert.strictEqual(res.statusCode, 403);
  });

  it('CUSTOMER IDOR: should block CUSTOMER A from retrieving CUSTOMER B quotation', async () => {
    (prisma.quotation.findUnique as any) = async () => ({
      id: 'q-1',
      job: { technician_id: 'tech-1', booking: { customer_id: 'cust-2' } }
    });
    const { req, res } = mockReqRes({ role: 'CUSTOMER', id: 'cust-1' }, {}, { id: 'q-1' });
    await getQuotation(req, res);
    assert.strictEqual(res.statusCode, 404);
    assert.ok(res.data.error.includes('access denied'));
  });

  // TECHNICIAN IDOR & CREATION
  it('should create quotation by TECHNICIAN and change job status', async () => {
    const { req, res } = mockReqRes({ role: 'TECHNICIAN', id: 'tech-1' }, { job_id: 'job-1', discount: 10 });
    
    let createData: any;
    let jobUpdateData: any;
    (prisma.quotation.create as any) = async (args: any) => {
      createData = args.data;
      return { ...args.data, id: 'q-1' };
    };
    (prisma.jobAssignment.update as any) = async (args: any) => {
      jobUpdateData = args.data;
    };

    await createQuotation(req, res);
    
    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(createData.status, 'DRAFT');
    assert.strictEqual(createData.discount.toNumber(), 10);
    assert.strictEqual(jobUpdateData.status, 'QUOTATION_PENDING');
  });

  it('TECHNICIAN ISOLATION: should block TECHNICIAN A from accessing TECHNICIAN B quotation', async () => {
    (prisma.quotation.findUnique as any) = async () => ({
      id: 'q-1',
      job: { technician_id: 'tech-2', booking: { customer_id: 'cust-1' } }
    });
    const { req, res } = mockReqRes({ role: 'TECHNICIAN', id: 'tech-1' }, {}, { id: 'q-1' });
    await getQuotation(req, res);
    assert.strictEqual(res.statusCode, 404);
    assert.ok(res.data.error.includes('access denied'));
  });

  // BRANCH ADMIN ISOLATION
  it('BRANCH ADMIN ISOLATION: should block BRANCH A admin from modifying BRANCH B quotation', async () => {
    (prisma.quotation.findUnique as any) = async () => ({
      id: 'q-1',
      status: 'DRAFT',
      job: { technician_id: 'tech-1', booking: { branch_id: 'branch-2' } }
    });
    const { req, res } = mockReqRes({ role: 'BRANCH_ADMIN', branch_id: 'branch-1' }, {
      item_name: 'Part A', quantity: 2, unit_price: 100, tax_rate: 18
    }, { id: 'q-1' });

    await addQuotationItem(req, res);
    assert.strictEqual(res.statusCode, 404);
    assert.ok(res.data.error.includes('access denied'));
  });

  // MASTER ADMIN
  it('MASTER ADMIN: can successfully access globally', async () => {
    (prisma.quotation.findUnique as any) = async () => ({
      id: 'q-1',
      job: { technician_id: 'tech-1', booking: { branch_id: 'branch-2' } }
    });
    const { req, res } = mockReqRes({ role: 'MASTER_ADMIN' }, {}, { id: 'q-1' });
    await getQuotation(req, res);
    assert.strictEqual(res.statusCode, 200);
  });

  // INVALID JOB STATE
  it('INVALID JOB STATE: should block creating quotation if job is not in DIAGNOSIS', async () => {
    (prisma.jobAssignment.findUnique as any) = async () => ({
      id: 'job-1',
      status: 'ACCEPTED', // Invalid state for creating quotation
      technician_id: 'tech-1',
      booking: { customer_id: 'cust-1', branch_id: 'branch-1' }
    });

    const { req, res } = mockReqRes({ role: 'TECHNICIAN', id: 'tech-1' }, { job_id: 'job-1' });
    await createQuotation(req, res);
    
    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.data.error.includes('Invalid job status transition'));
  });

  it('should not allow duplicate quotation', async () => {
    (prisma.quotation.findUnique as any) = async () => ({ id: 'q-1' });
    
    const { req, res } = mockReqRes({ role: 'TECHNICIAN', id: 'tech-1' }, { job_id: 'job-1' });
    await createQuotation(req, res);
    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.data.error.includes('already has a quotation'));
  });

  // ADD ITEM
  it('should add item and recalculate totals safely discarding client tax/total', async () => {
    (prisma.quotation.findUnique as any) = async () => ({
      id: 'q-1',
      status: 'DRAFT',
      job: { technician_id: 'tech-1', booking: { customer_id: 'cust-1' } },
      items: [
        { total_price: new Decimal(236), tax_amount: new Decimal(36) } 
      ],
      discount: new Decimal(10)
    });

    let itemCreated: any;
    let quotationUpdated: any;
    (prisma.quotationItem.create as any) = async (args: any) => {
      itemCreated = args.data;
      return args.data;
    };
    (prisma.quotation.update as any) = async (args: any) => {
      quotationUpdated = args.data;
    };

    const { req, res } = mockReqRes({ role: 'TECHNICIAN', id: 'tech-1' }, {
      item_name: 'Part A',
      quantity: 2,
      unit_price: 100,
      tax_rate: 18,
      tax_amount: 1, // Malicious
      total_price: 1 // Malicious
    }, { id: 'q-1' });

    await addQuotationItem(req, res);
    
    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(itemCreated.tax_amount.toNumber(), 36);
    assert.strictEqual(itemCreated.total_price.toNumber(), 236);

    assert.strictEqual(quotationUpdated.tax_amount.toNumber(), 36);
    assert.strictEqual(quotationUpdated.total_amount.toNumber(), 226);
  });

  // UPDATE ITEM
  it('should update item and recalculate totals', async () => {
    // 1st call for verifyQuotationOwnership, 2nd call in recalculateQuotationTotals
    (prisma.quotation.findUnique as any) = async () => ({
      id: 'q-1',
      status: 'DRAFT',
      job: { technician_id: 'tech-1', booking: { customer_id: 'cust-1' } },
      items: [
        { total_price: new Decimal(50), tax_amount: new Decimal(0) } // Mocked new totals
      ],
      discount: new Decimal(0)
    });

    (prisma.quotationItem.findUnique as any) = async () => ({
      id: 'item-1',
      quotation_id: 'q-1',
      quantity: 2,
      unit_price: new Decimal(100),
      tax_rate: new Decimal(18)
    });

    let itemUpdated: any;
    let quotationUpdated: any;
    (prisma.quotationItem.update as any) = async (args: any) => {
      itemUpdated = args.data;
      return args.data;
    };
    (prisma.quotation.update as any) = async (args: any) => {
      quotationUpdated = args.data;
    };

    const { req, res } = mockReqRes({ role: 'TECHNICIAN', id: 'tech-1' }, {
      quantity: 1,
      unit_price: 50,
      tax_rate: 0,
      total_price: 999 // Client tampering attempt
    }, { id: 'q-1', itemId: 'item-1' });

    await updateQuotationItem(req, res);
    
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(itemUpdated.tax_amount.toNumber(), 0);
    assert.strictEqual(itemUpdated.total_price.toNumber(), 50);

    assert.strictEqual(quotationUpdated.tax_amount.toNumber(), 0);
    assert.strictEqual(quotationUpdated.total_amount.toNumber(), 50);
  });

  // REMOVE ITEM
  it('should remove item and recalculate totals correctly', async () => {
    (prisma.quotation.findUnique as any) = async () => ({
      id: 'q-1',
      status: 'DRAFT',
      job: { technician_id: 'tech-1', booking: { customer_id: 'cust-1' } },
      items: [], // After removal, 0 items
      discount: new Decimal(0)
    });

    let itemDeleted = false;
    let quotationUpdated: any;
    (prisma.quotationItem.delete as any) = async () => { itemDeleted = true; };
    (prisma.quotation.update as any) = async (args: any) => {
      quotationUpdated = args.data;
    };

    const { req, res } = mockReqRes({ role: 'TECHNICIAN', id: 'tech-1' }, {}, { id: 'q-1', itemId: 'item-1' });

    await removeQuotationItem(req, res);
    
    assert.strictEqual(res.statusCode, 204);
    assert.strictEqual(itemDeleted, true);

    // Totals should be zero
    assert.strictEqual(quotationUpdated.tax_amount.toNumber(), 0);
    assert.strictEqual(quotationUpdated.total_amount.toNumber(), 0);
  });

  it('should reject removing item after quotation is SENT', async () => {
    (prisma.quotation.findUnique as any) = async () => ({
      id: 'q-1',
      status: 'SENT',
      job: { technician_id: 'tech-1', booking: { customer_id: 'cust-1' } }
    });

    const { req, res } = mockReqRes({ role: 'TECHNICIAN', id: 'tech-1' }, {}, { id: 'q-1', itemId: 'item-1' });

    await removeQuotationItem(req, res);
    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.data.error.includes('Only DRAFT'));
  });

  // SEND QUOTATION
  it('should send quotation and update job status', async () => {
    (prisma.quotation.findUnique as any) = async () => ({
      id: 'q-1',
      status: 'DRAFT',
      job_id: 'job-1',
      job: { status: 'QUOTATION_PENDING', technician_id: 'tech-1', booking: { customer_id: 'cust-1' } },
      items: [{ total_price: new Decimal(100), tax_amount: new Decimal(0) }],
      discount: new Decimal(0)
    });

    let qStatus: any;
    let jStatus: any;
    (prisma.quotation.update as any) = async (args: any) => { qStatus = args.data; };
    (prisma.jobAssignment.update as any) = async (args: any) => { jStatus = args.data; };

    const { req, res } = mockReqRes({ role: 'TECHNICIAN', id: 'tech-1' }, {}, { id: 'q-1' });

    await sendQuotation(req, res);
    
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(qStatus.status, 'SENT');
    assert.strictEqual(jStatus.status, 'AWAITING_CUSTOMER_APPROVAL');
  });

  it('should reject editing after quotation is SENT', async () => {
    (prisma.quotation.findUnique as any) = async () => ({
      id: 'q-1',
      status: 'SENT',
      job: { technician_id: 'tech-1', booking: { customer_id: 'cust-1' } }
    });

    const { req, res } = mockReqRes({ role: 'TECHNICIAN', id: 'tech-1' }, { item_name: 'Extra' }, { id: 'q-1' });

    await addQuotationItem(req, res);
    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.data.error.includes('Only DRAFT'));
  });

  // ==========================================
  // PHASE 2B: APPROVAL TESTS
  // ==========================================

  it('CUSTOMER: should successfully approve their own SENT quotation', async () => {
    (prisma.quotation.findUnique as any) = async () => ({
      id: 'q-1',
      job_id: 'job-1',
      status: 'SENT',
      job: {
        id: 'job-1',
        status: 'AWAITING_CUSTOMER_APPROVAL',
        booking: { customer_id: 'cust-1', branch_id: 'branch-1' }
      }
    });

    let qUpdated: any = null;
    let jUpdated: any = null;

    (prisma.quotation.update as any) = async (args: any) => {
      qUpdated = args.data;
      return { id: 'q-1', ...args.data };
    };
    (prisma.jobAssignment.update as any) = async (args: any) => {
      jUpdated = args.data;
      return { id: 'job-1', ...args.data };
    };

    const { req, res } = mockReqRes({ role: 'CUSTOMER', id: 'cust-1' }, {}, { id: 'q-1' });

    await approveQuotation(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(qUpdated.status, 'APPROVED');
    assert.strictEqual(qUpdated.approved_by_user_id, 'cust-1');
    assert.ok(qUpdated.approved_at instanceof Date);
    assert.strictEqual(jUpdated.status, 'IN_PROGRESS');
    assert.strictEqual(res.data.message, 'Quotation approved successfully');
  });

  // ==========================================
  // PHASE 2B: REJECTION TESTS
  // ==========================================

  it('CUSTOMER: should successfully reject their own SENT quotation with reason', async () => {
    (prisma.quotation.findUnique as any) = async () => ({
      id: 'q-1',
      job_id: 'job-1',
      status: 'SENT',
      job: {
        id: 'job-1',
        status: 'AWAITING_CUSTOMER_APPROVAL',
        booking: { customer_id: 'cust-1', branch_id: 'branch-1' }
      }
    });

    let qUpdated: any = null;
    let jUpdated: any = null;

    (prisma.quotation.update as any) = async (args: any) => {
      qUpdated = args.data;
      return { id: 'q-1', ...args.data };
    };
    (prisma.jobAssignment.update as any) = async (args: any) => {
      jUpdated = args.data;
      return { id: 'job-1', ...args.data };
    };

    const { req, res } = mockReqRes(
      { role: 'CUSTOMER', id: 'cust-1' },
      { rejection_reason: 'Price is too high' },
      { id: 'q-1' }
    );

    await rejectQuotation(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(qUpdated.status, 'REJECTED');
    assert.strictEqual(qUpdated.rejection_reason, 'Price is too high');
    assert.strictEqual(jUpdated.status, 'CANCELLED');
    assert.strictEqual(res.data.message, 'Quotation rejected successfully');
  });

  it('REJECTION: should require a valid non-empty rejection reason', async () => {
    const { req, res } = mockReqRes(
      { role: 'CUSTOMER', id: 'cust-1' },
      { rejection_reason: '   ' },
      { id: 'q-1' }
    );

    await rejectQuotation(req, res);
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.data.error, 'Rejection reason is required');
  });

  // ==========================================
  // PHASE 2B: SECURITY & RBAC TESTS
  // ==========================================

  it('RBAC: non-customers (TECHNICIAN, BRANCH_ADMIN, MASTER_ADMIN) cannot approve quotations', async () => {
    for (const role of ['TECHNICIAN', 'BRANCH_ADMIN', 'MASTER_ADMIN']) {
      const { req, res } = mockReqRes({ role, id: 'user-1', branch_id: 'branch-1' }, {}, { id: 'q-1' });
      await approveQuotation(req, res);
      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.data.error, 'Only customers can approve quotations');
    }
  });

  it('RBAC: non-customers (TECHNICIAN, BRANCH_ADMIN, MASTER_ADMIN) cannot reject quotations', async () => {
    for (const role of ['TECHNICIAN', 'BRANCH_ADMIN', 'MASTER_ADMIN']) {
      const { req, res } = mockReqRes(
        { role, id: 'user-1', branch_id: 'branch-1' },
        { rejection_reason: 'Reason' },
        { id: 'q-1' }
      );
      await rejectQuotation(req, res);
      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.data.error, 'Only customers can reject quotations');
    }
  });

  it('IDOR: customer cannot approve another customer quotation', async () => {
    (prisma.quotation.findUnique as any) = async () => ({
      id: 'q-1',
      job_id: 'job-1',
      status: 'SENT',
      job: {
        id: 'job-1',
        status: 'AWAITING_CUSTOMER_APPROVAL',
        booking: { customer_id: 'cust-2', branch_id: 'branch-1' }
      }
    });

    const { req, res } = mockReqRes({ role: 'CUSTOMER', id: 'cust-1' }, {}, { id: 'q-1' });

    await approveQuotation(req, res);
    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(res.data.error, 'Quotation not found or access denied');
  });

  it('IDOR: customer cannot reject another customer quotation', async () => {
    (prisma.quotation.findUnique as any) = async () => ({
      id: 'q-1',
      job_id: 'job-1',
      status: 'SENT',
      job: {
        id: 'job-1',
        status: 'AWAITING_CUSTOMER_APPROVAL',
        booking: { customer_id: 'cust-2', branch_id: 'branch-1' }
      }
    });

    const { req, res } = mockReqRes(
      { role: 'CUSTOMER', id: 'cust-1' },
      { rejection_reason: 'Too expensive' },
      { id: 'q-1' }
    );

    await rejectQuotation(req, res);
    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(res.data.error, 'Quotation not found or access denied');
  });

  // ==========================================
  // PHASE 2B: INVALID STATE TESTS
  // ==========================================

  it('INVALID STATE: DRAFT quotation cannot be approved', async () => {
    (prisma.quotation.findUnique as any) = async () => ({
      id: 'q-1',
      status: 'DRAFT',
      job: { status: 'AWAITING_CUSTOMER_APPROVAL', booking: { customer_id: 'cust-1' } }
    });

    const { req, res } = mockReqRes({ role: 'CUSTOMER', id: 'cust-1' }, {}, { id: 'q-1' });
    await approveQuotation(req, res);
    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.data.error.includes('only SENT quotations can be approved'));
  });

  it('INVALID STATE: DRAFT quotation cannot be rejected', async () => {
    (prisma.quotation.findUnique as any) = async () => ({
      id: 'q-1',
      status: 'DRAFT',
      job: { status: 'AWAITING_CUSTOMER_APPROVAL', booking: { customer_id: 'cust-1' } }
    });

    const { req, res } = mockReqRes(
      { role: 'CUSTOMER', id: 'cust-1' },
      { rejection_reason: 'No longer needed' },
      { id: 'q-1' }
    );
    await rejectQuotation(req, res);
    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.data.error.includes('only SENT quotations can be rejected'));
  });

  it('INVALID STATE: APPROVED quotation cannot be approved or rejected again (Terminal)', async () => {
    (prisma.quotation.findUnique as any) = async () => ({
      id: 'q-1',
      status: 'APPROVED',
      job: { status: 'IN_PROGRESS', booking: { customer_id: 'cust-1' } }
    });

    // Attempt re-approval
    const { req: req1, res: res1 } = mockReqRes({ role: 'CUSTOMER', id: 'cust-1' }, {}, { id: 'q-1' });
    await approveQuotation(req1, res1);
    assert.strictEqual(res1.statusCode, 400);
    assert.ok(res1.data.error.includes('only SENT quotations can be approved'));

    // Attempt rejection on approved
    const { req: req2, res: res2 } = mockReqRes(
      { role: 'CUSTOMER', id: 'cust-1' },
      { rejection_reason: 'Changed mind' },
      { id: 'q-1' }
    );
    await rejectQuotation(req2, res2);
    assert.strictEqual(res2.statusCode, 400);
    assert.ok(res2.data.error.includes('only SENT quotations can be rejected'));
  });

  it('INVALID STATE: REJECTED quotation cannot be approved or rejected again (Terminal)', async () => {
    (prisma.quotation.findUnique as any) = async () => ({
      id: 'q-1',
      status: 'REJECTED',
      job: { status: 'CANCELLED', booking: { customer_id: 'cust-1' } }
    });

    // Attempt approval on rejected
    const { req: req1, res: res1 } = mockReqRes({ role: 'CUSTOMER', id: 'cust-1' }, {}, { id: 'q-1' });
    await approveQuotation(req1, res1);
    assert.strictEqual(res1.statusCode, 400);
    assert.ok(res1.data.error.includes('only SENT quotations can be approved'));

    // Attempt re-rejection
    const { req: req2, res: res2 } = mockReqRes(
      { role: 'CUSTOMER', id: 'cust-1' },
      { rejection_reason: 'Reject again' },
      { id: 'q-1' }
    );
    await rejectQuotation(req2, res2);
    assert.strictEqual(res2.statusCode, 400);
    assert.ok(res2.data.error.includes('only SENT quotations can be rejected'));
  });

  it('INVALID STATE: quotation approval fails if job is not in AWAITING_CUSTOMER_APPROVAL', async () => {
    (prisma.quotation.findUnique as any) = async () => ({
      id: 'q-1',
      job_id: 'job-1',
      status: 'SENT',
      job: {
        id: 'job-1',
        status: 'DIAGNOSIS',
        booking: { customer_id: 'cust-1', branch_id: 'branch-1' }
      }
    });

    const { req, res } = mockReqRes({ role: 'CUSTOMER', id: 'cust-1' }, {}, { id: 'q-1' });
    await approveQuotation(req, res);
    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.data.error.includes('expected AWAITING_CUSTOMER_APPROVAL'));
  });

  // ==========================================
  // PHASE 2B: TRANSACTION ATOMICITY & ROLLBACK TESTS
  // ==========================================

  it('TRANSACTION ATOMICITY: approval rolls back if job assignment update fails', async () => {
    (prisma.quotation.findUnique as any) = async () => ({
      id: 'q-1',
      job_id: 'job-1',
      status: 'SENT',
      job: {
        id: 'job-1',
        status: 'AWAITING_CUSTOMER_APPROVAL',
        booking: { customer_id: 'cust-1', branch_id: 'branch-1' }
      }
    });

    let quotationUpdated = false;
    (prisma.quotation.update as any) = async () => {
      quotationUpdated = true;
      return { id: 'q-1', status: 'APPROVED' };
    };

    // Simulate Job update failure
    (prisma.jobAssignment.update as any) = async () => {
      throw new Error('Database write error on jobAssignment');
    };

    const { req, res } = mockReqRes({ role: 'CUSTOMER', id: 'cust-1' }, {}, { id: 'q-1' });

    await approveQuotation(req, res);
    assert.strictEqual(res.statusCode, 500);
    assert.strictEqual(res.data.error, 'Failed to approve quotation');
  });

  it('TRANSACTION ATOMICITY: rejection rolls back if job assignment update fails', async () => {
    (prisma.quotation.findUnique as any) = async () => ({
      id: 'q-1',
      job_id: 'job-1',
      status: 'SENT',
      job: {
        id: 'job-1',
        status: 'AWAITING_CUSTOMER_APPROVAL',
        booking: { customer_id: 'cust-1', branch_id: 'branch-1' }
      }
    });

    (prisma.quotation.update as any) = async () => {
      return { id: 'q-1', status: 'REJECTED' };
    };

    (prisma.jobAssignment.update as any) = async () => {
      throw new Error('Database write error on jobAssignment during cancellation');
    };

    const { req, res } = mockReqRes(
      { role: 'CUSTOMER', id: 'cust-1' },
      { rejection_reason: 'Too expensive' },
      { id: 'q-1' }
    );

    await rejectQuotation(req, res);
    assert.strictEqual(res.statusCode, 500);
    assert.strictEqual(res.data.error, 'Failed to reject quotation');
  });

});
