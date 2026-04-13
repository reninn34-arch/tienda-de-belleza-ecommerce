"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAdminProfile } from "@/components/ProfileModal";

interface Branch { id: string; name: string; }
interface CashSession {
  id: string;
  branchId: string;
  status: "OPEN" | "CLOSED";
  openingBalance: number;
  expectedClosingBalance: number;
  actualClosingBalance: number | null;
  difference: number | null;
  notes: string | null;
  openedAt: string;
  closedAt: string | null;
  admin: { name: string };
  branch: { name: string };
  movements: { id: string; type: string; amount: number; reason: string; createdAt: string }[];
}

function DiffBadge({ diff }: { diff: number | null }) {
  if (diff === null) return <span className="text-gray-300 text-xs font-medium">—</span>;
  const color = diff === 0 ? "text-gray-500 bg-gray-50" : diff > 0 ? "text-emerald-600 bg-emerald-50" : "text-red-600 bg-red-50";
  return (
    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${color}`}>
      {diff > 0 ? "+" : ""}{diff.toFixed(2)}
    </span>
  );
}

export default function CashPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<CashSession[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const profile = getAdminProfile();
    if (profile.role !== "ADMIN") {
      router.replace("/admin");
      return;
    }
    setIsAdmin(true);

    Promise.all([
      fetch("/api/admin/cash/history").then(r => r.json()),
      fetch("/api/admin/branches").then(r => r.json()),
    ]).then(([h, b]) => {
      setSessions(h);
      setBranches(b);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [router]);

  const filteredSessions = selectedBranchId
    ? sessions.filter(s => s.branchId === selectedBranchId)
    : sessions;

  const openCount = sessions.filter(s => s.status === "OPEN").length;
  const totalDifferences = sessions.filter(s => s.difference !== null).reduce((acc, s) => acc + (s.difference || 0), 0);

  const fmtDate = (d: string) => new Date(d).toLocaleString("es", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  if (loading) return <div className="p-8 flex justify-center"><div className="w-8 h-8 border-2 border-[#33172c] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <>
    <div className="p-4 sm:p-8 max-w-6xl mx-auto print:hidden">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Historial de Cajas</h1>
          <p className="text-sm text-gray-400 mt-1">Arqueos y sesiones por sucursal</p>
        </div>
        <select
          value={selectedBranchId}
          onChange={e => setSelectedBranchId(e.target.value)}
          className="bg-white border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-700 outline-none focus:border-[#33172c] shadow-sm"
        >
          <option value="">Todas las sucursales</option>
          {branches.map(b => (
            <option key={b.id} value={b.id}>{b.name === "tienda-online" ? "Tienda Online" : b.name}</option>
          ))}
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Sesiones Totales",
            value: filteredSessions.length.toString(),
            icon: "receipt_long",
            color: "text-indigo-600 bg-indigo-50",
          },
          {
            label: "Cajas Abiertas",
            value: openCount.toString(),
            icon: "lock_open",
            color: openCount > 0 ? "text-emerald-600 bg-emerald-50" : "text-gray-400 bg-gray-50",
          },
          {
            label: "Diferencia Acumulada",
            value: `${totalDifferences >= 0 ? "+" : ""}$${totalDifferences.toFixed(2)}`,
            icon: "balance",
            color: totalDifferences >= 0 ? "text-gray-700 bg-gray-50" : "text-red-600 bg-red-50",
          },
          {
            label: "Cajas Cerradas",
            value: filteredSessions.filter(s => s.status === "CLOSED").length.toString(),
            icon: "lock",
            color: "text-gray-500 bg-gray-50",
          },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${k.color}`}>
              <span className="material-symbols-outlined text-[20px]">{k.icon}</span>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{k.label}</p>
              <p className="text-lg font-black text-gray-800">{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Sessions List */}
      <div className="space-y-3">
        {filteredSessions.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <span className="material-symbols-outlined text-5xl text-gray-200 mb-3 block">account_balance_wallet</span>
            <p className="text-gray-400 font-medium">No hay sesiones de caja registradas</p>
          </div>
        )}
        {filteredSessions.map(s => (
          <div key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Session row */}
            <div
              className="flex items-center gap-4 p-5 cursor-pointer hover:bg-gray-50/50 transition-colors"
              onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
            >
              {/* Status dot */}
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s.status === "OPEN" ? "bg-emerald-500 animate-pulse" : "bg-gray-300"}`}></div>

              {/* Branch + admin */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold text-gray-800">
                    {s.branch?.name === "tienda-online" ? "Tienda Online" : s.branch?.name}
                  </p>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${s.status === "OPEN" ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500"}`}>
                    {s.status === "OPEN" ? "Abierta" : "Cerrada"}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {s.admin?.name} · {fmtDate(s.openedAt)}
                </p>
              </div>

              {/* Financials */}
              <div className="hidden sm:flex items-center gap-6 text-right">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Inicial</p>
                  <p className="text-sm font-semibold text-gray-700">${s.openingBalance.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Esperado</p>
                  <p className="text-sm font-semibold text-gray-700">${s.expectedClosingBalance.toFixed(2)}</p>
                </div>
                {s.status === "CLOSED" && (
                  <>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Real</p>
                      <p className="text-sm font-semibold text-gray-700">${(s.actualClosingBalance || 0).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Diferencia</p>
                      <DiffBadge diff={s.difference} />
                    </div>
                  </>
                )}
              </div>

              <span className={`material-symbols-outlined text-gray-300 text-[18px] transition-transform ${expandedId === s.id ? "rotate-180" : ""}`}>
                expand_more
              </span>
            </div>

            {/* Expanded detail */}
            {expandedId === s.id && (
              <div className="border-t border-gray-100 bg-gray-50/50 p-5">
                <div className="flex items-center justify-between mb-5">
                   <h4 className="text-xs font-bold text-gray-800 uppercase tracking-widest">Detalle de Sesión</h4>
                   {s.status === "CLOSED" && (
                     <button onClick={() => window.print()} className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm">
                       <span className="material-symbols-outlined text-[16px]">print</span>
                       Imprimir Corte Z
                     </button>
                   )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-5">
                  {[
                    { label: "Fondo Inicial", value: `$${s.openingBalance.toFixed(2)}` },
                    { 
                      label: "Ventas (Cash)", 
                      value: `$${(s.movements?.filter(m => m.reason.startsWith("Venta POS")).reduce((acc, m) => acc + (m.type === "IN" ? m.amount : -m.amount), 0) || 0).toFixed(2)}`,
                      color: "text-emerald-600"
                    },
                    { 
                      label: "Otros Movs", 
                      value: `${(s.movements?.filter(m => !m.reason.startsWith("Venta POS")).reduce((acc, m) => acc + (m.type === "IN" ? m.amount : -m.amount), 0) || 0) >= 0 ? "+" : ""}${(s.movements?.filter(m => !m.reason.startsWith("Venta POS")).reduce((acc, m) => acc + (m.type === "IN" ? m.amount : -m.amount), 0) || 0).toFixed(2)}`
                    },
                    { label: "Total Esperado", value: `$${s.expectedClosingBalance.toFixed(2)}`, color: "text-gray-900" },
                    { label: "Balance Real", value: s.actualClosingBalance !== null ? `$${s.actualClosingBalance.toFixed(2)}` : "—", color: s.difference !== 0 ? "text-rose-600" : "text-gray-900" },
                  ].map(k => (
                    <div key={k.label} className="bg-white rounded-xl p-3 border border-gray-100">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">{k.label}</p>
                      <p className={`text-sm font-black ${k.color || "text-gray-800"}`}>{k.value}</p>
                    </div>
                  ))}
                </div>

                {/* Movements */}
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Movimientos ({s.movements?.length || 0})</p>
                {s.movements && s.movements.length > 0 ? (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {s.movements.map(m => (
                      <div key={m.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-100 text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${m.type === "IN" ? "bg-emerald-50 text-emerald-500" : "bg-red-50 text-red-400"}`}>
                            <span className="material-symbols-outlined text-[12px]">{m.type === "IN" ? "add" : "remove"}</span>
                          </span>
                          <span className="text-gray-600 truncate max-w-[160px]">{m.reason}</span>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-[10px] text-gray-400">{fmtDate(m.createdAt)}</span>
                          <span className={`font-bold ${m.type === "IN" ? "text-emerald-600" : "text-red-500"}`}>
                            {m.type === "IN" ? "+" : "-"}${m.amount.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">Sin movimientos manuales registrados.</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>

    {/* TICKETS PARA IMPRESORA TÉRMICA (Corte Z) */}
    {expandedId && (
      <div className="hidden print:block print:w-[80mm] print:m-0 print:p-4 text-black text-sm bg-white" style={{ fontFamily: "monospace" }}>
        {sessions.filter(s => s.id === expandedId).map(s => (
          <div key={`print-${s.id}`}>
            <div className="text-center mb-4 pb-4 border-b border-black border-dashed">
               <h1 className="text-xl font-bold uppercase mb-1">CORTE Z</h1>
               <p className="text-sm">Sucursal: {s.branch?.name}</p>
               <p className="text-xs mt-1">Ticket #: {s.id.slice(-6).toUpperCase()}</p>
            </div>
            
            <div className="mb-4 text-xs font-bold space-y-1">
               <p>Cajero: {s.admin?.name}</p>
               <p>Apertura: {fmtDate(s.openedAt)}</p>
               <p>Cierre: {s.closedAt ? fmtDate(s.closedAt) : "EN CURSO"}</p>
            </div>

            <div className="mb-4 pb-4 border-b border-black border-dashed">
               <div className="flex justify-between font-bold mb-1"><span className="uppercase">Fondo Inicial:</span><span>${s.openingBalance.toFixed(2)}</span></div>
               <div className="flex justify-between font-bold mb-1">
                  <span className="uppercase">Ventas Netas:</span>
                  <span>
                    ${(s.movements?.filter(m => m.reason.startsWith("Venta POS")).reduce((acc, m) => acc + (m.type === "IN" ? m.amount : -m.amount), 0) || 0).toFixed(2)}
                  </span>
               </div>
               <div className="flex justify-between font-bold mb-1">
                  <span className="uppercase">Otros Movs:</span>
                  <span>
                    ${(s.movements?.filter(m => !m.reason.startsWith("Venta POS")).reduce((acc, m) => acc + (m.type === "IN" ? m.amount : -m.amount), 0) || 0).toFixed(2)}
                  </span>
               </div>
               <div className="flex justify-between font-bold mt-3 text-[16px]"><span className="uppercase">Total General:</span><span>${s.expectedClosingBalance.toFixed(2)}</span></div>
            </div>

            {s.status === "CLOSED" && (
              <div className="mb-4 pb-4 border-b border-black border-dashed">
                 <div className="flex justify-between font-bold mb-1"><span className="uppercase">Efectivo Físico:</span><span>${(s.actualClosingBalance || 0).toFixed(2)}</span></div>
                 <div className="flex justify-between font-bold mt-2 text-lg"><span className="uppercase">Diferencia:</span><span>{s.difference !== null && s.difference > 0 ? "+" : ""}{(s.difference || 0).toFixed(2)}</span></div>
              </div>
            )}

            {s.movements && s.movements.length > 0 && (
              <div className="mb-4">
                 <p className="text-center font-bold uppercase mb-2 border-b border-black border-solid pb-1">Movimientos (Caja Chica)</p>
                 {s.movements.map(m => (
                   <div key={m.id} className="flex justify-between text-xs mb-1">
                     <span className="truncate w-3/4">{m.type === "IN" ? "+" : "-"}{m.reason.slice(0,20)}</span>
                     <span className="font-bold w-1/4 text-right">${m.amount.toFixed(2)}</span>
                   </div>
                 ))}
              </div>
            )}

            <div className="text-center mt-8 pt-8">
               <p className="border-t border-black inline-block px-8 pb-2 mt-4 text-xs font-bold uppercase">{s.admin?.name}</p>
               <p className="text-[10px]">Firma Cajero</p>
            </div>
            
            <p className="text-center text-[10px] mt-8 uppercase font-bold">-- FIN DEL REPORTE --</p>
          </div>
        ))}
      </div>
    )}
    </>
  );
}
