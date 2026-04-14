"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { getAdminProfile } from "@/components/ProfileModal";

interface Branch {
  id: string;
  name: string;
  address?: string | null;
}

interface InventoryItem {
  branchId: string;
  stock: number;
}

interface Product {
  id: string;
  name: string;
  image: string;
  sku?: string;
  minStock?: number;
  inventories?: InventoryItem[];
}

export default function InventoryPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  
  // Record<productId, { stock?: number, minStock?: number }>
  const [changes, setChanges] = useState<Record<string, { stock?: number; minStock?: number }>>({});
  const [toast, setToast] = useState("");

  useEffect(() => {
    const profile = getAdminProfile();
    
    Promise.all([
      fetch("/api/admin/branches").then(r => r.json()),
      fetch("/api/admin/products").then(r => r.json())
    ]).then(([b, p]) => {
      let filteredBranches = b;
      
      // Si es VENDEDOR, solo puede ver su propia sucursal
      if (profile.role === "VENDEDOR" && profile.branchId) {
        filteredBranches = b.filter((bx: any) => bx.id === profile.branchId);
      }
      
      setBranches(filteredBranches);
      setProducts(p);
      
      if (filteredBranches.length > 0) {
        // Seleccionar la sucursal del perfil si existe entre las filtradas, si no la primera
        const target = filteredBranches.find((bx: any) => bx.id === profile.branchId) || filteredBranches[0];
        setSelectedBranchId(target.id);
      }
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const handleStockChange = (productId: string, val: string) => {
    const num = parseInt(val, 10);
    if (isNaN(num) || num < 0) return;
    setChanges(prev => ({
      ...prev,
      [productId]: { ...prev[productId], stock: num }
    }));
  };

  const handleMinStockChange = (productId: string, val: string) => {
    const num = parseInt(val, 10);
    if (isNaN(num) || num < 0) return;
    setChanges(prev => ({
      ...prev,
      [productId]: { ...prev[productId], minStock: num }
    }));
  };

  const saveChanges = async () => {
    if (Object.keys(changes).length === 0) return;
    setSaving(true);
    
    const updates = Object.entries(changes).map(([productId, ch]) => ({
      productId,
      branchId: selectedBranchId,
      stock: ch.stock,
      minStock: ch.minStock
    }));

    try {
      const res = await fetch("/api/admin/inventory/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates })
      });
      
      if (!res.ok) throw new Error("Error saving");
      
      // Actualizar el estado local para reflejar los cambios
      setProducts(prevProducts => prevProducts.map(p => {
        const update = changes[p.id];
        if (update) {
          let updatedP = { ...p };
          if (update.minStock !== undefined) updatedP.minStock = update.minStock;
          
          if (update.stock !== undefined) {
             const newInventories = p.inventories ? [...p.inventories] : [];
             const idx = newInventories.findIndex(inv => inv.branchId === selectedBranchId);
             if (idx >= 0) newInventories[idx].stock = update.stock;
             else newInventories.push({ branchId: selectedBranchId, stock: update.stock });
             updatedP.inventories = newInventories;
          }
          return updatedP;
        }
        return p;
      }));
      
      setChanges({});
      setToast("Inventario guardado correctamente");
      setTimeout(() => setToast(""), 3000);
    } catch (error) {
      alert("Hubo un error al guardar el inventario.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-6 h-6 rounded-full border-2 border-[#33172c] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Inventario</h1>
          <p className="text-sm text-gray-400 mt-1">Acualiza el stock rápidamente por sucursal</p>
        </div>
        
        {branches.length > 0 && (
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest hidden md:block">
              Sucursal:
            </label>
            <select 
              value={selectedBranchId}
              onChange={(e) => {
                setSelectedBranchId(e.target.value);
                setChanges({}); // Limpiar cambios no guardados al cambiar de sucursal
              }}
              className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-800 focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none shadow-sm min-w-[200px]"
            >
              {branches.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {toast && (
        <div className="mb-4 bg-emerald-50 text-emerald-600 px-4 py-3 rounded-xl text-sm border border-emerald-100 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          {toast}
        </div>
      )}

      {selectedBranchId ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest w-[60px]">Img</th>
                <th className="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Producto</th>
                <th className="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Stock Actual</th>
                <th className="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Stock Alerta</th>
                <th className="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Nuevo Stock</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-50">
              {products.map(product => {
                // Buscar stock existente en la DB
                const inventory = product.inventories?.find(inv => inv.branchId === selectedBranchId);
                const currentStock = inventory?.stock || 0;
                const minThreshold = product.minStock ?? 5;
                
                // Buscar si hay cambios no guardados
                const change = changes[product.id];
                const displayStock = change?.stock !== undefined ? change.stock : currentStock;
                const displayMinStock = change?.minStock !== undefined ? change.minStock : minThreshold;
                
                const isCritical = currentStock <= minThreshold;
                const stockColor = currentStock === 0 ? "text-red-500 font-bold" : isCritical ? "text-amber-500 font-bold" : "text-gray-500";
                
                return (
                  <tr key={product.id} className={`hover:bg-gray-50/30 transition-colors ${isCritical ? 'bg-rose-50/20' : ''}`}>
                    <td className="py-2.5 px-4">
                      {product.image ? (
                        <div className="w-10 h-10 rounded-lg overflow-hidden relative bg-gray-100 border border-gray-100">
                          <Image src={product.image} alt={product.name} fill className="object-cover" sizes="40px" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center">
                          <span className="material-symbols-outlined text-gray-300 text-[20px]">image</span>
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-gray-800">
                      <div className="flex items-center gap-2">
                        {product.name}
                        {isCritical && (
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title="Stock Bajo" />
                        )}
                      </div>
                      {product.sku && <div className="text-[10px] text-gray-400 font-mono mt-0.5">{product.sku}</div>}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border ${isCritical ? 'bg-rose-100 border-rose-200 text-rose-700' : 'bg-gray-50 border-gray-100 text-gray-500'}`}>
                        {currentStock}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                       <input 
                        type="number" 
                        min="0"
                        value={displayMinStock}
                        onChange={(e) => handleMinStockChange(product.id, e.target.value)}
                        className={`w-16 border rounded-lg px-2 py-1.5 text-xs text-right font-mono transition-colors ${
                          change?.minStock !== undefined 
                            ? "border-indigo-300 bg-indigo-50 text-indigo-900" 
                            : "border-gray-200 text-gray-400"
                        }`}
                        title="Umbral de alerta"
                      />
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <input 
                        type="number" 
                        min="0"
                        value={displayStock}
                        onChange={(e) => handleStockChange(product.id, e.target.value)}
                        className={`w-24 border rounded-lg px-3 py-1.5 text-sm text-right font-mono font-medium focus:ring-2 focus:ring-rose-500/20 outline-none transition-colors ${
                          change?.stock !== undefined 
                            ? "border-rose-300 bg-rose-50 text-rose-900 focus:border-rose-400" 
                            : "border-gray-200 focus:border-gray-900"
                        }`}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              {Object.keys(changes).length > 0 
                ? <span className="text-amber-600 font-bold">{Object.keys(changes).length} producto(s) modificados</span>
                : "No hay cambios pendientes"}
            </p>
            <button
              onClick={saveChanges}
              disabled={saving || Object.keys(changes).length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#33172c] hover:bg-[#4a2441] text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {saving ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span className="material-symbols-outlined text-[18px]">save</span>
              )}
              {saving ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 px-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <span className="material-symbols-outlined text-[48px] text-gray-200 mb-3 block">store_off</span>
          <p className="text-gray-500 font-medium">No se han encontrado sucursales</p>
          <p className="text-sm text-gray-400 mt-1">Debe crear al menos una sucursal para gestionar su inventario.</p>
        </div>
      )}
    </div>
  );
}
