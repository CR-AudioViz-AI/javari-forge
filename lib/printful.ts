// Printful Integration for Market Forge
// Print-on-Demand Automation - FIXED VERSION
// Updated: December 22, 2025 - 10:55 PM EST
// Store ID: 16513682 (Personal orders)

const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;
const PRINTFUL_STORE_ID = process.env.PRINTFUL_STORE_ID || '16513682';
const PRINTFUL_API_URL = 'https://api.printful.com';

export interface PrintfulProduct {
  id: number;
  title: string;
  type: string;
  type_name: string;
  brand: string;
  model: string;
  image: string;
  variant_count: number;
  currency: string;
  is_discontinued: boolean;
}

export interface PrintfulVariant {
  id: number;
  product_id: number;
  name: string;
  size: string;
  color: string;
  color_code: string;
  price: string;
  in_stock: boolean;
  availability_status: string;
}

export interface PrintfulProductDetail {
  product: PrintfulProduct;
  variants: PrintfulVariant[];
}

export interface ShippingRate {
  id: string;
  name: string;
  rate: string;
  currency: string;
  minDeliveryDays: number;
  maxDeliveryDays: number;
}

export interface CostEstimate {
  subtotal: string;
  discount: string;
  shipping: string;
  digitization: string;
  additional_fee: string;
  fulfillment_fee: string;
  tax: string;
  vat: string;
  total: string;
}

export interface PrintfulRecipient {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state_code: string;
  country_code: string;
  zip: string;
  email?: string;
  phone?: string;
}

export interface PrintfulOrderItem {
  variant_id: number;
  quantity: number;
  files: Array<{ type?: string; url: string }>;
}

/**
 * Get authentication headers with store ID
 */
function getHeaders(): HeadersInit {
  if (!PRINTFUL_API_KEY) {
    throw new Error('PRINTFUL_API_KEY not configured');
  }
  return {
    'Authorization': `Bearer ${PRINTFUL_API_KEY}`,
    'Content-Type': 'application/json',
    'X-PF-Store-Id': PRINTFUL_STORE_ID,
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

  const data = await response.json();
  
  if (data.code !== 200) {
    throw new Error(data.error?.message || data.result || `Printful API error: ${data.code}`);
  }

  return data.result;
}

/**
 * Get catalog of available products
 */
export async function getCatalog(limit = 20): Promise<PrintfulProduct[]> {
  const products = await printfulRequest<PrintfulProduct[]>(`/products?limit=${limit}`);
  return products;
}

/**
 * Get product details with variants
 */
export async function getProduct(productId: number): Promise<PrintfulProductDetail> {
  return printfulRequest<PrintfulProductDetail>(`/products/${productId}`);
}

/**
 * Get specific variant details
 */
export async function getVariant(variantId: number): Promise<PrintfulVariant> {
  return printfulRequest<PrintfulVariant>(`/products/variant/${variantId}`);
}

/**
 * Calculate shipping rates
 */
export async function getShippingRates(params: {
  recipient: PrintfulRecipient;
  items: Array<{ variant_id: number; quantity: number }>;
}): Promise<ShippingRate[]> {
  return printfulRequest<ShippingRate[]>('/shipping/rates', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

/**
 * Estimate order costs
 */
export async function estimateCosts(params: {
  recipient: PrintfulRecipient;
  items: PrintfulOrderItem[];
}): Promise<{ costs: CostEstimate }> {
  return printfulRequest<{ costs: CostEstimate }>('/orders/estimate-costs', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

/**
 * Create mockup generation task
 */
export async function createMockupTask(params: {
  productId: number;
  variantIds: number[];
  files: Array<{ placement: string; image_url: string }>;
}): Promise<{ task_key: string; status: string }> {
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
export async function getMockupResult(taskKey: string): Promise<{
  status: string;
  mockups?: Array<{ placement: string; variant_ids: number[]; mockup_url: string }>;
  error?: string;
}> {
  return printfulRequest(`/mockup-generator/task?task_key=${taskKey}`);
}

/**
 * Get store information
 */
export async function getStoreInfo(): Promise<{
  id: number;
  name: string;
  type: string;
  currency: string;
}> {
  const stores = await printfulRequest<Array<{
    id: number;
    name: string;
    type: string;
    currency: string;
  }>>('/stores');
  return stores[0];
}

/**
 * Create draft order (does not charge or submit)
 */
export async function createDraftOrder(params: {
  recipient: PrintfulRecipient;
  items: PrintfulOrderItem[];
}): Promise<{ id: number; status: string }> {
  return printfulRequest('/orders', {
    method: 'POST',
    body: JSON.stringify({
      ...params,
      confirm: false, // Draft only - won't be submitted
    }),
  });
}

/**
 * Popular product IDs for quick access
 */
export const POPULAR_PRODUCTS = {
  tShirt: 71,           // Unisex Staple T-Shirt | Bella + Canvas 3001
  hoodie: 380,          // Unisex Heavy Blend Hoodie | Gildan 18500
  mug: 19,              // White Glossy Mug
  poster: 1,            // Enhanced Matte Paper Poster
  phoneCase: 195,       // iPhone Case
  toteBag: 84,          // Large Organic Tote
  sticker: 358,         // Kiss-Cut Stickers
  canvas: 2,            // Canvas Print
} as const;

/**
 * Get popular products with details
 */
export async function getPopularProducts(): Promise<PrintfulProductDetail[]> {
  const productIds = Object.values(POPULAR_PRODUCTS);
  const products = await Promise.all(
    productIds.slice(0, 5).map(id => getProduct(id).catch(() => null))
  );
  return products.filter((p): p is PrintfulProductDetail => p !== null);
}

/**
 * Quick price check for a product
 */
export async function getProductPricing(productId: number): Promise<{
  product: string;
  basePrice: string;
  variants: Array<{ name: string; price: string }>;
}> {
  const detail = await getProduct(productId);
  const variants = detail.variants.slice(0, 5).map(v => ({
    name: v.name,
    price: v.price,
  }));
  
  return {
    product: detail.product.title,
    basePrice: detail.variants[0]?.price || 'N/A',
    variants,
  };
}
