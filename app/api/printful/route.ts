// API Route: /api/printful
// Printful POD Integration - FIXED VERSION
// Updated: December 22, 2025 - 10:55 PM EST

import { NextRequest, NextResponse } from 'next/server';
import * as printful from '@/lib/printful';

// Helper for consistent error responses
function errorResponse(message: string, status = 500) {
  return NextResponse.json({ success: false, error: message }, { status });
}

// GET - Read operations
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') || 'info';

  try {
    switch (action) {
      case 'catalog': {
        const limit = parseInt(searchParams.get('limit') || '20');
        const catalog = await printful.getCatalog(limit);
        return NextResponse.json({ success: true, products: catalog, count: catalog.length });
      }

      case 'product': {
        const productId = searchParams.get('id');
        if (!productId) {
          return errorResponse('Product ID required', 400);
        }
        const product = await printful.getProduct(parseInt(productId));
        return NextResponse.json({ success: true, product });
      }

      case 'popular': {
        const products = await printful.getPopularProducts();
        return NextResponse.json({ success: true, products, count: products.length });
      }

      case 'pricing': {
        const productId = searchParams.get('id');
        if (!productId) {
          return errorResponse('Product ID required', 400);
        }
        const pricing = await printful.getProductPricing(parseInt(productId));
        return NextResponse.json({ success: true, pricing });
      }

      case 'store': {
        const store = await printful.getStoreInfo();
        return NextResponse.json({ success: true, store });
      }

      case 'mockup-status': {
        const taskKey = searchParams.get('task_key');
        if (!taskKey) {
          return errorResponse('Task key required', 400);
        }
        const result = await printful.getMockupResult(taskKey);
        return NextResponse.json({ success: true, result });
      }

      case 'info':
      default:
        return NextResponse.json({
          success: true,
          api: 'Printful POD Integration',
          version: '2.0',
          actions: {
            GET: ['info', 'catalog', 'product', 'popular', 'pricing', 'store', 'mockup-status'],
            POST: ['shipping', 'estimate', 'mockup'],
          },
          popularProducts: printful.POPULAR_PRODUCTS,
          documentation: 'https://developers.printful.com/docs/',
        });
    }
  } catch (error) {
    console.error('Printful GET error:', error);
    return errorResponse((error as Error).message);
  }
}

// POST - Write operations
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  if (!action) {
    return errorResponse('Action parameter required. Use: shipping, estimate, mockup', 400);
  }

  try {
    const body = await req.json();

    switch (action) {
      case 'shipping': {
        const { recipient, items } = body;
        if (!recipient || !items) {
          return errorResponse('recipient and items are required', 400);
        }
        const rates = await printful.getShippingRates({ recipient, items });
        return NextResponse.json({ success: true, rates, count: rates.length });
      }

      case 'estimate': {
        const { recipient, items } = body;
        if (!recipient || !items) {
          return errorResponse('recipient and items are required', 400);
        }
        const estimate = await printful.estimateCosts({ recipient, items });
        return NextResponse.json({ success: true, estimate });
      }

      case 'mockup': {
        const { productId, variantIds, files } = body;
        if (!productId || !variantIds || !files) {
          return errorResponse('productId, variantIds, and files are required', 400);
        }
        const task = await printful.createMockupTask({ productId, variantIds, files });
        return NextResponse.json({ success: true, task });
      }

      default:
        return errorResponse(`Unknown action: ${action}. Use: shipping, estimate, mockup`, 400);
    }
  } catch (error) {
    console.error('Printful POST error:', error);
    return errorResponse((error as Error).message);
  }
}
