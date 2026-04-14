"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  branch?: { name: string };
}

interface Branch { id: string; name: string; }

const CATEGORIES = [
  "Alquiler", "Salarios", "Publicidad", "Servicios", "Insumos", "Mantenimiento", "Otros"
];

const CAT_STYLES: Record<string, string> = {
  Alquiler: "bg-blue-50 text-blue-700 border-blue-100",
  Salarios: "bg-indigo-50 text-indigo-700 border-indigo-100",
  Publicidad: "bg-purple-50 text-purple-700 border-purple-100",
  Servicios: "bg-amber-50 text-amber-700 border-amber-100",
  Insumos: "bg-emerald-50 text-emerald-700 border-emerald-100",
  Mantenimiento: "bg-orange-50 text-orange-700 border-orange-100",
  Otros: "bg-gray-50 text-gray-700 border-gray-100",
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [showForm, setShowForm] = useState(false);
  const [newExp, setNewExp] = useState({
    description: "",
    amount: "",
    category: "Otros",
    date: new Date().toISOString().split('T')[0],
    branchId: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const [eRes, bRes] = await Promise.all([
      fetch("/api/admin/expenses"),
      fetch("/api/admin/branches")
    ]);
    if (eRes.ok) setExpenses(await eRes.json());
    if (bRes.ok) setBranches(await bRes.json());
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newExp.description || !newExp.amount) return;

    try {
      const res = await fetch("/api/admin/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newExp, amount: parseFloat(newExp.amount) })
      });
      if (res.ok) {
        setShowForm(false);
        setNewExp({ description: "", amount: "", category: "Otros", date: new Date().toISOString().split('T')[0], branchId: "" });
        fetchData();
      }
    } catch (err) {
      alert("Error al guardar gasto");
    }
  }

  async function deleteExp(id: string) {
    if (!confirm("¿Eliminar este registro?")) return;
    await fetch(`/api/admin/expenses/${id}`, { method: "DELETE" });
    fetchData();
  }

  const totalMonth = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gastos Operativos</h1>
          <p className="text-sm text-gray-500 mt-1">Registra los costos fijos y variables para calcular tu beneficio neto.</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-rose-600 text-white text-sm font-bold rounded-xl hover:bg-rose-700 transition-all shadow-sm shadow-rose-200"
        >
          <span className="material-symbols-outlined text-[20px]">{showForm ? 'close' : 'add'}</span>
          {showForm ? 'Cancelar' : 'Registrar Gasto'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-gray-100 shadow-xl p-6 sm:p-8 mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Descripción</label>
              <input 
                required
                type="text" 
                value={newExp.description}
                onChange={e => setNewExp({...newExp, description: e.target.value})}
                placeholder="Ej: Pago de Luz - Matriz"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-rose-500/20 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Monto ($)</label>
              <input 
                required
                type="number" 
                step="0.01"
                value={newExp.amount}
                onChange={e => setNewExp({...newExp, amount: e.target.value})}
                placeholder="0.00"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-rose-500/20 outline-none transition-all font-bold text-rose-600"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Fecha</label>
              <input 
                type="date" 
                value={newExp.date}
                onChange={e => setNewExp({...newExp, date: e.target.value})}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-rose-500/20 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Categoría</label>
              <select 
                value={newExp.category}
                onChange={e => setNewExp({...newExp, category: e.target.value})}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500/20"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Sucursal Asociada</label>
              <select 
                value={newExp.branchId}
                onChange={e => setNewExp({...newExp, branchId: e.target.value})}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none"
              >
                <option value="">Gasto General (Sin sucursal)</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="md:col-span-2 flex items-end">
               <button 
                 type="submit"
                 className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-all shadow-lg"
               >
                 Guardar Registro
               </button>
            </div>
          </div>
        </form>
      )}

      {/* Stats Summary */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 mb-8 flex items-center justify-between">
         <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Gasto Total Acumulado</p>
            <p className="text-3xl font-black text-rose-600">${totalMonth.toFixed(2)}</p>
         </div>
         <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600">
            <span className="material-symbols-outlined text-[28px]">account_balance_wallet</span>
         </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Gasto / Concepto</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Sucursal</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Categoría</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Monto</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400">Cargando gastos...</td></tr>
              ) : expenses.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400">No hay gastos registrados.</td></tr>
              ) : (
                expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-gray-900">{e.description}</p>
                      <p className="text-[10px] text-gray-400 italic">{new Date(e.date).toLocaleDateString()}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <span className="material-symbols-outlined text-[14px] text-gray-400">{e.branch ? 'storefront' : 'public'}</span>
                        {e.branch?.name || 'General'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase ${CAT_STYLES[e.category]}`}>
                        {e.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-rose-600">-${e.amount.toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <button 
                         onClick={() => deleteExp(e.id)}
                         className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                       >
                         <span className="material-symbols-outlined text-[20px]">delete</span>
                       </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
