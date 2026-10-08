import { describe, it, beforeEach } from 'node:test';
import * as assert from 'node:assert';
import prisma from '../config/prisma';
import { 
  createQuotation, 
  addQuotationItem, 
  updateQuotationItem,
  removeQuotationItem,
  sendQuotation,
  getQuotation
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

});
