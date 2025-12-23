'use client';

// Printful Product Browser Component
// For Market Forge POD Integration
// Updated: December 22, 2025 - 11:00 PM EST

import React, { useState, useEffect } from 'react';

interface Product {
  id: number;
  title: string;
  type_name: string;
  brand: string;
  image: string;
  variant_count: number;
}

interface Variant {
  id: number;
  name: string;
  size: string;
  color: string;
  color_code: string;
  price: string;
  in_stock: boolean;
}

interface ProductDetail {
  product: Product;
  variants: Variant[];
}

interface ShippingRate {
  id: string;
  name: string;
  rate: string;
  minDeliveryDays: number;
  maxDeliveryDays: number;
}

export default function PrintfulBrowser() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductDetail | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'catalog' | 'product' | 'estimate'>('catalog');

  // Load catalog on mount
  useEffect(() => {
    loadCatalog();
  }, []);

  async function loadCatalog() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/printful?action=popular');
      const data = await res.json();
      if (data.success) {
        setProducts(data.products.map((p: ProductDetail) => p.product));
      } else {
        throw new Error(data.error || 'Failed to load catalog');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function loadProduct(productId: number) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/printful?action=product&id=${productId}`);
      const data = await res.json();
      if (data.success) {
        setSelectedProduct(data.product);
        setSelectedVariant(null);
        setView('product');
      } else {
        throw new Error(data.error || 'Failed to load product');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function calculateShipping() {
    if (!selectedVariant) return;
    
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/printful?action=shipping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: {
            address1: '123 Test St',
            city: 'Fort Myers',
            state_code: 'FL',
            country_code: 'US',
            zip: '33901',
          },
          items: [{ variant_id: selectedVariant.id, quantity: 1 }],
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShippingRates(data.rates);
        setView('estimate');
      } else {
        throw new Error(data.error || 'Failed to calculate shipping');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function goBack() {
    if (view === 'estimate') {
      setView('product');
      setShippingRates([]);
    } else if (view === 'product') {
      setView('catalog');
      setSelectedProduct(null);
      setSelectedVariant(null);
    }
  }

  // Render loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading...</span>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-red-800 font-semibold">Error</h3>
        <p className="text-red-600">{error}</p>
        <button
          onClick={() => { setError(null); loadCatalog(); }}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  // Render catalog view
  if (view === 'catalog') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">POD Product Catalog</h2>
          <span className="text-sm text-gray-500">Powered by Printful</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div
              key={product.id}
              onClick={() => loadProduct(product.id)}
              className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
            >
              <div className="aspect-square bg-gray-100 flex items-center justify-center">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.title}
                    className="w-full h-full object-contain p-4"
                  />
                ) : (
                  <span className="text-gray-400">No Image</span>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-lg line-clamp-2">{product.title}</h3>
                <p className="text-gray-500 text-sm mt-1">{product.brand}</p>
                <p className="text-blue-600 text-sm mt-2">
                  {product.variant_count} variants available
                </p>
              </div>
            </div>
          ))}
        </div>
        
        <button
          onClick={loadCatalog}
          className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
        >
          Refresh Catalog
        </button>
      </div>
    );
  }

  // Render product detail view
  if (view === 'product' && selectedProduct) {
    const { product, variants } = selectedProduct;
    const uniqueColors = [...new Set(variants.map(v => v.color))].slice(0, 10);
    const uniqueSizes = [...new Set(variants.map(v => v.size))].slice(0, 10);

    return (
      <div className="space-y-6">
        <button
          onClick={goBack}
          className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
        >
          ← Back to Catalog
        </button>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-gray-100 rounded-lg aspect-square flex items-center justify-center">
            {product.image ? (
              <img
                src={product.image}
                alt={product.title}
                className="w-full h-full object-contain p-8"
              />
            ) : (
              <span className="text-gray-400">No Image</span>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold">{product.title}</h1>
              <p className="text-gray-500">{product.brand} • {product.type_name}</p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Available Colors</h3>
              <div className="flex flex-wrap gap-2">
                {uniqueColors.map((color) => (
                  <span
                    key={color}
                    className="px-3 py-1 bg-gray-100 rounded-full text-sm"
                  >
                    {color}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Available Sizes</h3>
              <div className="flex flex-wrap gap-2">
                {uniqueSizes.map((size) => (
                  <span
                    key={size}
                    className="px-3 py-1 bg-gray-100 rounded-full text-sm"
                  >
                    {size}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Select Variant</h3>
              <select
                className="w-full p-3 border rounded-lg"
                value={selectedVariant?.id || ''}
                onChange={(e) => {
                  const variant = variants.find(v => v.id === parseInt(e.target.value));
                  setSelectedVariant(variant || null);
                }}
              >
                <option value="">Choose a variant...</option>
                {variants.slice(0, 20).map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.name} - ${variant.price}
                  </option>
                ))}
              </select>
            </div>

            {selectedVariant && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="font-semibold">{selectedVariant.name}</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  ${selectedVariant.price}
                </p>
                <p className={`text-sm mt-1 ${selectedVariant.in_stock ? 'text-green-600' : 'text-red-600'}`}>
                  {selectedVariant.in_stock ? '✓ In Stock' : '✗ Out of Stock'}
                </p>
              </div>
            )}

            <button
              onClick={calculateShipping}
              disabled={!selectedVariant}
              className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                selectedVariant
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Calculate Shipping & Cost
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render estimate view
  if (view === 'estimate' && selectedProduct && selectedVariant) {
    return (
      <div className="space-y-6">
        <button
          onClick={goBack}
          className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
        >
          ← Back to Product
        </button>

        <h2 className="text-2xl font-bold">Shipping Estimate</h2>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold">{selectedProduct.product.title}</h3>
          <p className="text-gray-600">{selectedVariant.name}</p>
          <p className="text-xl font-bold mt-2">${selectedVariant.price}</p>
        </div>

        <div>
          <h3 className="font-semibold mb-3">Shipping Options (to Fort Myers, FL)</h3>
          <div className="space-y-3">
            {shippingRates.map((rate) => (
              <div
                key={rate.id}
                className="flex justify-between items-center p-4 bg-white border rounded-lg"
              >
                <div>
                  <p className="font-medium">{rate.name}</p>
                  <p className="text-sm text-gray-500">
                    {rate.minDeliveryDays}-{rate.maxDeliveryDays} business days
                  </p>
                </div>
                <span className="text-lg font-semibold">${rate.rate}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-semibold text-green-800">Estimated Total</h3>
          <p className="text-2xl font-bold text-green-700 mt-1">
            ${(parseFloat(selectedVariant.price) + parseFloat(shippingRates[0]?.rate || '0')).toFixed(2)}
          </p>
          <p className="text-sm text-green-600 mt-1">
            Product + Standard Shipping
          </p>
        </div>

        <div className="flex gap-4">
          <button
            onClick={goBack}
            className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Change Options
          </button>
          <button
            className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            onClick={() => alert('Full checkout integration coming soon!')}
          >
            Proceed to Design Upload
          </button>
        </div>
      </div>
    );
  }

  return null;
}
