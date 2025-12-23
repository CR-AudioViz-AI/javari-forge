// Printful Integration for Market Forge
// Print-on-Demand Automation
// Updated: December 22, 2025

const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;
const PRINTFUL_API_URL = 'https://api.printful.com';

export interface PrintfulProduct {
  id: number;
  name: string;
  type: string;
  variants: PrintfulVariant[];
  image: string;
}

export interface PrintfulVariant {
  id: number;
  name: string;
  size: string;
  color: string;
  price: number;
  availability: string;
}

export interface PrintfulDesign {
  type: 'front' | 'back' | 'sleeve' | 'label';
  imageUrl: string;
  position: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
}

export interface PrintfulOrder {
  id: string;
  status: string;
  recipient: PrintfulRecipient;
  items: PrintfulOrderItem[];
  costs: PrintfulCosts;
  created: string;
}

export interface PrintfulRecipient {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state_code: string;
  country_code: string;
  zip: string;
  email: string;
  phone?: string;
}

export interface PrintfulOrderItem {
  sync_variant_id: number;
  quantity: number;
  files: PrintfulFile[];
}

export interface PrintfulFile {
  type: string;
  url: string;
}

export interface PrintfulCosts {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
}

/**
 * Get authentication headers
 */
function getHeaders(): HeadersInit {
  if (!PRINTFUL_API_KEY) {
    throw new Error('PRINTFUL_API_KEY not configured');
  }
  return {
    'Authorization': `Bearer ${PRINTFUL_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Make API request to Printful
 */
async function printfulRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${PRINTFUL_API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...getHeaders(),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.result || `Printful API error: ${response.status}`);
  }

  const data = await response.json();
  return data.result;
}

/**
 * Get catalog of available products
 */
export async function getCatalog(): Promise<PrintfulProduct[]> {
  return printfulRequest('/products');
}

/**
 * Get product details with variants
 */
export async function getProduct(productId: number): Promise<PrintfulProduct> {
  return printfulRequest(`/products/${productId}`);
}

/**
 * Create sync product (store product linked to Printful)
 */
export async function createSyncProduct(params: {
  name: string;
  thumbnail: string;
  variants: Array<{
    variant_id: number;
    retail_price: number;
    files: PrintfulFile[];
  }>;
}): Promise<{ id: number; external_id: string }> {
  return printfulRequest('/sync/products', {
    method: 'POST',
    body: JSON.stringify({
      sync_product: {
        name: params.name,
        thumbnail: params.thumbnail,
      },
      sync_variants: params.variants,
    }),
  });
}

/**
 * Create mockup for product
 */
export async function createMockup(params: {
  productId: number;
  variantIds: number[];
  files: PrintfulFile[];
}): Promise<{ mockups: Array<{ placement: string; mockup_url: string }> }> {
  return printfulRequest(`/mockup-generator/create-task/${params.productId}`, {
    method: 'POST',
    body: JSON.stringify({
      variant_ids: params.variantIds,
      files: params.files,
    }),
  });
}

/**
 * Get mockup task result
 */
export async function getMockupResult(
  taskKey: string
): Promise<{ status: string; mockups: Array<{ placement: string; mockup_url: string }> }> {
  return printfulRequest(`/mockup-generator/task?task_key=${taskKey}`);
}

/**
 * Calculate shipping rates
 */
export async function getShippingRates(params: {
  recipient: PrintfulRecipient;
  items: Array<{ variant_id: number; quantity: number }>;
}): Promise<Array<{ id: string; name: string; rate: number; minDeliveryDays: number; maxDeliveryDays: number }>> {
  return printfulRequest('/shipping/rates', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

/**
 * Create order
 */
export async function createOrder(params: {
  recipient: PrintfulRecipient;
  items: PrintfulOrderItem[];
  retail_costs?: Partial<PrintfulCosts>;
}): Promise<PrintfulOrder> {
  return printfulRequest('/orders', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

/**
 * Get order status
 */
export async function getOrder(orderId: string): Promise<PrintfulOrder> {
  return printfulRequest(`/orders/${orderId}`);
}

/**
 * List orders
 */
export async function listOrders(params?: {
  status?: string;
  offset?: number;
  limit?: number;
}): Promise<PrintfulOrder[]> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.offset) query.set('offset', params.offset.toString());
  if (params?.limit) query.set('limit', params.limit.toString());
  
  const queryString = query.toString();
  return printfulRequest(`/orders${queryString ? `?${queryString}` : ''}`);
}

/**
 * Cancel order
 */
export async function cancelOrder(orderId: string): Promise<void> {
  await printfulRequest(`/orders/${orderId}`, { method: 'DELETE' });
}

/**
 * Get store info
 */
export async function getStoreInfo(): Promise<{
  id: number;
  name: string;
  type: string;
  currency: string;
}> {
  return printfulRequest('/stores');
}

/**
 * Estimate order costs
 */
export async function estimateCosts(params: {
  recipient: PrintfulRecipient;
  items: Array<{ variant_id: number; quantity: number; files: PrintfulFile[] }>;
}): Promise<PrintfulCosts> {
  return printfulRequest('/orders/estimate-costs', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

/**
 * Popular product templates for quick setup
 */
export const POPULAR_PRODUCTS = {
  tShirt: 71,          // Unisex Staple T-Shirt
  hoodie: 380,         // Unisex Heavy Blend Hoodie
  mug: 19,             // White Glossy Mug
  poster: 1,           // Enhanced Matte Paper Poster
  phoneCase: 195,      // iPhone Case
  toteBag: 84,         // Large Organic Tote
  sticker: 358,        // Kiss-Cut Stickers
  canvas: 2,           // Canvas Print
};

/**
 * Quick product creation with trending design
 */
export async function quickCreateProduct(params: {
  name: string;
  designUrl: string;
  productType: keyof typeof POPULAR_PRODUCTS;
  retailMarkup?: number; // Default 2x (100% markup)
}): Promise<{ productId: number; mockupUrls: string[] }> {
  const productId = POPULAR_PRODUCTS[params.productType];
  const markup = params.retailMarkup || 2;
  
  // Get product variants
  const product = await getProduct(productId);
  
  // Get base variants (first of each size/color combo)
  const baseVariants = product.variants.slice(0, 5);
  
  // Create sync product with design
  const syncProduct = await createSyncProduct({
    name: params.name,
    thumbnail: params.designUrl,
    variants: baseVariants.map(v => ({
      variant_id: v.id,
      retail_price: v.price * markup,
      files: [{ type: 'default', url: params.designUrl }],
    })),
  });

  // Generate mockups
  const mockupTask = await createMockup({
    productId,
    variantIds: baseVariants.map(v => v.id),
    files: [{ type: 'default', url: params.designUrl }],
  });

  return {
    productId: syncProduct.id,
    mockupUrls: mockupTask.mockups.map(m => m.mockup_url),
  };
}
