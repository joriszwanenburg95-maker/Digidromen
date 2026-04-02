import React, { useMemo, useState } from "react";
import { ShoppingCart, Plus, Minus, Search, Filter, Box, LayoutGrid, List } from "lucide-react";

import type { Product } from "../types";
import { statusClasses } from "../lib/format";

interface ProductCatalogProps {
  products: Product[];
  onAdd: (product: Product, quantity: number) => void;
}

const ProductCatalog: React.FC<ProductCatalogProps> = ({ products, onAdd }) => {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [view, setView] = useState<"grid" | "list">("grid");

  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category));
    return Array.from(cats).sort();
  }, [products]);

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
      <div className="flex items-center space-x-3 mb-4">
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
        <div className="flex items-center px-3 py-2 border border-gray-200 rounded-lg text-gray-600 bg-white">
          <Filter size={16} className="mr-2" />
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="bg-transparent text-sm outline-none"
          >
            <option value="all">Alle</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          <button
            onClick={() => setView("grid")}
            className={`p-2 ${view === "grid" ? "bg-slate-100 text-slate-900" : "text-slate-400 hover:bg-slate-50"}`}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => setView("list")}
            className={`p-2 ${view === "list" ? "bg-slate-100 text-slate-900" : "text-slate-400 hover:bg-slate-50"}`}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">Geen producten gevonden.</p>
      ) : view === "list" ? (
        <div className="overflow-hidden rounded-xl border border-slate-100">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Product</th>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Categorie</th>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Beschikbaar</th>
                <th className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Aantal</th>
                <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <p className="text-sm font-semibold text-slate-800">{product.name}</p>
                    <p className="text-xs text-slate-400">{product.specsSummary}</p>
                  </td>
                  <td className="px-4 py-2">
                    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{product.category}</span>
                  </td>
                  <td className="px-4 py-2">
                    <span className="text-sm text-slate-600">{product.availableQuantity}</span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-center space-x-2">
                      <button onClick={() => updateQuantity(product.id, -1)} className="p-1 rounded hover:bg-gray-100 text-gray-500">
                        <Minus size={14} />
                      </button>
                      <span className="text-sm font-bold w-4 text-center">{quantities[product.id] || 0}</span>
                      <button onClick={() => updateQuantity(product.id, 1)} className="p-1 rounded hover:bg-gray-100 text-gray-500">
                        <Plus size={14} />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      disabled={!(quantities[product.id] > 0) || (quantities[product.id] ?? 0) > product.availableQuantity}
                      onClick={() => {
                        onAdd(product, quantities[product.id]);
                        setQuantities((prev) => ({ ...prev, [product.id]: 0 }));
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        quantities[product.id] > 0
                          ? "bg-digidromen-primary text-white hover:bg-blue-700"
                          : "bg-gray-100 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      Toevoegen
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product) => (
            <div key={product.id} className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="p-3">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <Box size={16} className="text-slate-400 shrink-0" />
                    <h4 className="font-bold text-sm text-gray-800">{product.name}</h4>
                  </div>
                  <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full shrink-0">
                    {product.category}
                  </span>
                </div>
                <p className="text-xs font-semibold text-gray-500">{product.brand}</p>
                <p className="text-xs text-gray-500 mb-3">{product.specsSummary}</p>
                <div className="flex items-center justify-between text-xs mb-3">
                  <span className="font-medium text-gray-500">
                    Beschikbaar: {product.availableQuantity}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full font-semibold ${statusClasses(product.stockBadge)}`}
                  >
                    {product.stockBadge}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => updateQuantity(product.id, -1)}
                      className="p-1 rounded-md hover:bg-gray-100 text-gray-500"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="text-sm font-bold w-4 text-center">{quantities[product.id] || 0}</span>
                    <button
                      onClick={() => updateQuantity(product.id, 1)}
                      className="p-1 rounded-md hover:bg-gray-100 text-gray-500"
                    >
                      <Plus size={14} />
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
                      flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
                      ${quantities[product.id] > 0
                        ? 'bg-digidromen-primary text-white hover:bg-blue-700'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'}
                    `}
                  >
                    <ShoppingCart size={14} className="mr-1" />
                    Toevoegen
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductCatalog;
