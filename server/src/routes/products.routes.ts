import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { validate } from '../middleware/validate';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

const createProductSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  sku: z.string().min(3, 'SKU must be at least 3 characters'),
  carbonFootprintCo2: z.number().nonnegative('Carbon footprint must be positive'),
  recyclable: z.boolean().optional().default(true),
  materialsUsed: z.string().optional().nullable(),
});

const updateProductSchema = z.object({
  name: z.string().min(2).optional(),
  sku: z.string().min(3).optional(),
  carbonFootprintCo2: z.number().nonnegative().optional(),
  recyclable: z.boolean().optional(),
  materialsUsed: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

// GET /api/products - Get all products
router.get('/', requireAuth, async (req, res) => {
  const { recyclable } = req.query;

  try {
    const where: any = {};
    if (recyclable !== undefined) {
      where.recyclable = recyclable === 'true';
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return res.json({ success: true, data: products });
  } catch (error) {
    console.error('[Products] Error fetching products:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
});

// GET /api/products/:id - Get single product details
router.get('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        _count: {
          select: { carbonTransactions: true },
        },
      },
    });

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product profile not found' });
    }

    return res.json({ success: true, data: product });
  } catch (error) {
    console.error('[Products] Error fetching product details:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch product details' });
  }
});

// POST /api/products - Create product (Admin, Manager only)
router.post('/', requireAuth, requireRole('ADMIN', 'MANAGER'), validate(createProductSchema), async (req, res) => {
  const { name, sku, carbonFootprintCo2, recyclable, materialsUsed } = req.body;

  try {
    const existing = await prisma.product.findUnique({ where: { sku } });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Product SKU already exists' });
    }

    const product = await prisma.product.create({
      data: {
        name,
        sku,
        carbonFootprintCo2,
        recyclable,
        materialsUsed,
      },
    });

    return res.status(201).json({ success: true, data: product });
  } catch (error) {
    console.error('[Products] Error creating product:', error);
    return res.status(500).json({ success: false, error: 'Failed to create product' });
  }
});

// PATCH /api/products/:id - Update product (Admin, Manager only)
router.patch('/:id', requireAuth, requireRole('ADMIN', 'MANAGER'), validate(updateProductSchema), async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  try {
    const product = await prisma.product.update({
      where: { id },
      data,
    });

    return res.json({ success: true, data: product });
  } catch (error) {
    console.error('[Products] Error updating product:', error);
    return res.status(500).json({ success: false, error: 'Failed to update product' });
  }
});

// DELETE /api/products/:id - Soft delete product (Admin only)
router.delete('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const { id } = req.params;

  try {
    const product = await prisma.product.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });

    return res.json({ success: true, data: product });
  } catch (error) {
    console.error('[Products] Error deleting product:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete product' });
  }
});

export default router;
