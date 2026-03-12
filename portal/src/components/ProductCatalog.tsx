import React, { useMemo, useState } from "react";
import { ShoppingCart, Plus, Minus, Search, Filter, Box } from "lucide-react";

import type { Product } from "../types";
import { statusClasses } from "../lib/portal";

interface ProductCatalogProps {
  products: Product[];
  onAdd: (product: Product, quantity: number) => void;
}

const ProductCatalog: React.FC<ProductCatalogProps> = ({ products, onAdd }) => {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | "laptop" | "accessory">("all");

  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        const matchesQuery =
          query.length === 0 ||
          product.name.toLowerCase().includes(query.toLowerCase()) ||
          product.brand.toLowerCase().includes(query.toLowerCase()) ||
          product.specsSummary.toLowerCase().includes(query.toLowerCase());
        const matchesCategory =
          category === "all" ? true : product.category === category;
        return matchesQuery && matchesCategory;
      }),
    [category, products, query],
  );

  const updateQuantity = (id: string, delta: number) => {
    setQuantities((prev) => ({
      ...prev,
      [id]: Math.max(0, (prev[id] || 0) + delta),
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Zoek producten..." 
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-digidromen-primary focus:border-transparent outline-none"
          />
        </div>
        <div className="flex items-center px-4 py-2 border border-gray-200 rounded-lg text-gray-600 bg-white">
          <Filter size={18} className="mr-2" />
          <select
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as "all" | "laptop" | "accessory")
            }
            className="bg-transparent text-sm outline-none"
          >
            <option value="all">Alle categorieen</option>
            <option value="laptop">Laptops</option>
            <option value="accessory">Accessoires</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => (
          <div key={product.id} className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className="h-40 bg-gray-100 flex items-center justify-center text-gray-400">
              <Box size={48} />
            </div>
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-gray-800">{product.name}</h4>
                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full">
                  {product.category}
                </span>
              </div>
              <p className="text-xs font-semibold text-gray-500">{product.brand}</p>
              <p className="text-xs text-gray-500 mb-4">{product.specsSummary}</p>
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-gray-500">
                  Beschikbaar: {product.availableQuantity}
                </span>
                <span
                  className={`px-2 py-1 rounded-full font-semibold ${statusClasses(
                    product.stockBadge,
                  )}`}
                >
                  {product.stockBadge}
                </span>
              </div>
              
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50">
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => updateQuantity(product.id, -1)}
                    className="p-1 rounded-md hover:bg-gray-100 text-gray-500"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="text-sm font-bold w-4 text-center">{quantities[product.id] || 0}</span>
                  <button 
                    onClick={() => updateQuantity(product.id, 1)}
                    className="p-1 rounded-md hover:bg-gray-100 text-gray-500"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <button 
                  disabled={
                    !(quantities[product.id] > 0) ||
                    (quantities[product.id] ?? 0) > product.availableQuantity
                  }
                  onClick={() => {
                    onAdd(product, quantities[product.id]);
                    setQuantities((prev) => ({ ...prev, [product.id]: 0 }));
                  }}
                  className={`
                    flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-colors
                    ${quantities[product.id] > 0 
                      ? 'bg-digidromen-primary text-white hover:bg-blue-700' 
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'}
                  `}
                >
                  <ShoppingCart size={16} className="mr-2" />
                  Toevoegen
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductCatalog;
