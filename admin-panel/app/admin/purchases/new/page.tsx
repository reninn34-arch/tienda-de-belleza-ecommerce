"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Supplier { id: string; name: string; }
interface Branch { id: string; name: string; }
interface Product { id: string; name: string; cost?: number; image?: string; }

interface PurchaseItem {
  productId: string;
  name: string;
  quantity: number;
  unitCost: number;
}

export default function NewPurchasePage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  
  const [supplierId, setSupplierId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<PurchaseItem[]>([]);
  
  const [productSearch, setProductSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Cargar Catálogos
    const fetchData = async () => {
      const [sRes, bRes, pRes] = await Promise.all([
        fetch("/api/admin/suppliers"),
        fetch("/api/admin/branches"),
        fetch("/api/admin/products")
      ]);
      if (sRes.ok) setSuppliers(await sRes.json());
      if (bRes.ok) setBranches(await bRes.json());
      if (pRes.ok) setAllProducts(await pRes.json());
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (productSearch.length > 2) {
      setSearchResults(allProducts.filter(p => 
        p.name.toLowerCase().includes(productSearch.toLowerCase())
      ).slice(0, 5));
    } else {
      setSearchResults([]);
    }
  }, [productSearch, allProducts]);

  const addItem = (p: Product) => {
    const existing = items.find(item => item.productId === p.id);
    if (existing) return;

    setItems([...items, {
      productId: p.id,
      name: p.name,
      quantity: 1,
      unitCost: p.cost || 0
    }]);
    setProductSearch("");
  };

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.productId !== id));
  };

  const updateItem = (id: string, field: keyof PurchaseItem, value: number) => {
    setItems(items.map(i => i.productId === id ? { ...i, [field]: value } : i));
  };

  const total = items.reduce((sum, i) => sum + (i.quantity * i.unitCost), 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supplierId || !branchId || items.length === 0) return alert("Completa todos los campos");
    
    setLoading(true);
    try {
      const res = await fetch("/api/admin/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierId, branchId, notes, items })
      });

      if (res.ok) {
        router.push("/admin/purchases");
        router.refresh();
      } else {
        const err = await res.json();
        alert(err.message || "Error al crear orden");
      }
    } catch (error) {
      alert("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="mb-6 flex items-center gap-2 text-xs text-gray-400">
        <Link href="/admin/purchases" className="hover:text-gray-600 transition-colors">Compras</Link>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <span className="text-gray-600 font-semibold">Nueva Entrada de Mercancía</span>
      </div>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Registrar Entrada de Stock</h1>
        <div className="text-right">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Estimado</p>
          <p className="text-2xl font-bold text-emerald-600">${total.toFixed(2)}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Configuración (Izquierda) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
             <h3 className="font-bold text-gray-900 mb-2">Detalles de Origen</h3>
             
             <div>
               <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Proveedor</label>
               <select 
                 required
                 value={supplierId}
                 onChange={e => setSupplierId(e.target.value)}
                 className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
               >
                 <option value="">Selecciona un proveedor</option>
                 {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
               </select>
             </div>

             <div>
               <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Sucursal Destino</label>
               <select 
                 required
                 value={branchId}
                 onChange={e => setBranchId(e.target.value)}
                 className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
               >
                 <option value="">Selecciona sucursal</option>
                 {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
               </select>
             </div>

             <div>
               <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Notas / N° Factura</label>
               <textarea 
                 value={notes}
                 onChange={e => setNotes(e.target.value)}
                 className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                 rows={3}
                 placeholder="Ej: Factura #1234 - Importación"
               />
             </div>
          </div>
        </div>

        {/* Productos (Derecha) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
             <div className="p-4 border-b border-gray-100 bg-gray-50/20">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                  <input 
                    type="text"
                    placeholder="Buscar producto por nombre..."
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/10 outline-none"
                  />

                  {searchResults.length > 0 && (
                    <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl z-10 overflow-hidden">
                      {searchResults.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => addItem(p)}
                          className="w-full px-4 py-3 text-left hover:bg-indigo-50 flex items-center gap-3 transition-colors border-b border-gray-50 last:border-0"
                        >
                          <div className="w-8 h-8 rounded bg-gray-100 animate-pulse overflow-hidden">
                             {p.image && <img src={p.image} className="w-full h-full object-cover" alt="" />}
                          </div>
                          <span className="text-sm font-medium text-gray-700">{p.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
             </div>

             <div className="overflow-x-auto min-h-[300px]">
               <table className="w-full text-left">
                 <thead>
                    <tr className="bg-gray-50/50">
                      <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase">Producto</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase text-center">Cantidad</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase text-center">Costo Unit.</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase text-right">Subtotal</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase"></th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm">Escanea o busca productos para empezar</td>
                      </tr>
                    ) : (
                      items.map(item => (
                        <tr key={item.productId} className="group transition-colors">
                          <td className="px-6 py-4">
                            <p className="text-sm font-bold text-gray-900">{item.name}</p>
                            <p className="text-[10px] text-gray-400 font-mono uppercase">{item.productId}</p>
                          </td>
                          <td className="px-6 py-4">
                             <input 
                               type="number"
                               min={1}
                               value={item.quantity}
                               onChange={e => updateItem(item.productId, 'quantity', parseInt(e.target.value) || 0)}
                               className="w-20 mx-auto block px-2 py-1 bg-gray-50 border border-gray-100 rounded-lg text-sm text-center font-bold"
                             />
                          </td>
                          <td className="px-6 py-4">
                             <div className="flex items-center justify-center gap-1">
                               <span className="text-xs text-gray-400">$</span>
                               <input 
                                 type="number"
                                 step="0.01"
                                 value={item.unitCost}
                                 onChange={e => updateItem(item.productId, 'unitCost', parseFloat(e.target.value) || 0)}
                                 className="w-20 px-2 py-1 bg-gray-50 border border-gray-100 rounded-lg text-sm text-center font-bold text-indigo-600"
                               />
                             </div>
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-sm text-gray-900">
                             ${(item.quantity * item.unitCost).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-right">
                             <button type="button" onClick={() => removeItem(item.productId)} className="text-gray-300 hover:text-red-500 transition-colors">
                               <span className="material-symbols-outlined text-[18px]">delete</span>
                             </button>
                          </td>
                        </tr>
                      ))
                    )}
                 </tbody>
               </table>
             </div>
          </div>

          <div className="flex items-center justify-end gap-4">
             <Link href="/admin/purchases" className="text-sm font-bold text-gray-400 hover:text-gray-600 underline">Descartar</Link>
             <button 
               disabled={loading || items.length === 0}
               className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-opacity-90 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50"
             >
               {loading ? 'Procesando...' : 'Crear Orden de Compra'}
             </button>
          </div>
        </div>
      </form>
    </div>
  );
}
