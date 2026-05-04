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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-digidromen-dark/35" size={18} />
          <input
            type="text"
            placeholder="Zoek producten..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full rounded-lg border border-digidromen-cream py-2 pl-10 pr-4 text-digidromen-dark outline-none focus:border-digidromen-orange focus:ring-2 focus:ring-digidromen-orange/30"
          />
        </div>
        <div className="flex items-center rounded-lg border border-digidromen-cream bg-white px-3 py-2 text-digidromen-dark/65">
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
        <div className="flex overflow-hidden rounded-lg border border-digidromen-cream bg-white">
          <button
            onClick={() => setView("grid")}
            className={`p-2 ${view === "grid" ? "bg-digidromen-orange-light text-digidromen-orange" : "text-digidromen-dark/40 hover:bg-digidromen-cream/60"}`}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => setView("list")}
            className={`p-2 ${view === "list" ? "bg-digidromen-orange-light text-digidromen-orange" : "text-digidromen-dark/40 hover:bg-digidromen-cream/60"}`}
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
                    <span className="rounded-full bg-digidromen-orange-light px-2 py-0.5 text-xs text-digidromen-orange">{product.category}</span>
                  </td>
                  <td className="px-4 py-2">
                    <span className="text-sm text-slate-600">{product.availableQuantity}</span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-center space-x-2">
                      <button onClick={() => updateQuantity(product.id, -1)} className="rounded p-1 text-digidromen-dark/50 hover:bg-digidromen-cream/70">
                        <Minus size={14} />
                      </button>
                      <span className="text-sm font-bold w-4 text-center">{quantities[product.id] || 0}</span>
                      <button onClick={() => updateQuantity(product.id, 1)} className="rounded p-1 text-digidromen-dark/50 hover:bg-digidromen-cream/70">
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
                          ? "bg-digidromen-primary text-white hover:bg-digidromen-orange-hover"
                          : "cursor-not-allowed bg-digidromen-cream text-digidromen-dark/35"
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
            <div key={product.id} className="overflow-hidden rounded-xl border border-digidromen-cream bg-white shadow-sm transition-shadow hover:shadow-md">
              <div className="p-3">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <Box size={16} className="text-slate-400 shrink-0" />
                    <h4 className="text-sm font-bold text-digidromen-dark">{product.name}</h4>
                  </div>
                  <span className="shrink-0 rounded-full bg-digidromen-orange-light px-2 py-0.5 text-xs text-digidromen-orange">
                    {product.category}
                  </span>
                </div>
                <p className="text-xs font-semibold text-digidromen-dark/55">{product.brand}</p>
                <p className="mb-3 text-xs text-digidromen-dark/55">{product.specsSummary}</p>
                <div className="flex items-center justify-between text-xs mb-3">
                  <span className="font-medium text-digidromen-dark/55">
                    Beschikbaar: {product.availableQuantity}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full font-semibold ${statusClasses(product.stockBadge)}`}
                  >
                    {product.stockBadge}
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-digidromen-cream/70 pt-3">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => updateQuantity(product.id, -1)}
                      className="rounded-md p-1 text-digidromen-dark/50 hover:bg-digidromen-cream/70"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="text-sm font-bold w-4 text-center">{quantities[product.id] || 0}</span>
                    <button
                      onClick={() => updateQuantity(product.id, 1)}
                      className="rounded-md p-1 text-digidromen-dark/50 hover:bg-digidromen-cream/70"
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
                        ? 'bg-digidromen-primary text-white hover:bg-digidromen-orange-hover'
                        : 'cursor-not-allowed bg-digidromen-cream text-digidromen-dark/35'}
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
