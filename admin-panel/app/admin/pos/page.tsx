"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { getAdminProfile } from "@/components/ProfileModal";

interface Branch { id: string; name: string; }
interface Product { id: string; name: string; price: number; image: string; inventories?: { branchId: string; stock: number }[]; }
interface CartItem extends Product { quantity: number; }
interface CashSession {
  id: string;
  status: "OPEN" | "CLOSED";
  openingBalance: number;
  expectedClosingBalance: number;
  admin: { name: string };
  movements?: { amount: number; reason: string; type: "IN" | "OUT" }[];
}

export default function POSPage() {
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [activeSession, setActiveSession] = useState<CashSession | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [search, setSearch] = useState("");
  
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "transfer">("cash");
  const [cashTendered, setCashTendered] = useState<string>("");
  const [toast, setToast] = useState<{message: string, type: "success" | "error"} | null>(null);

  // Modals
  const [showOpeningModal, setShowOpeningModal] = useState(false);
  const [showClosingModal, setShowClosingModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [openingBalanceInput, setOpeningBalanceInput] = useState("");
  const [closingBalanceInput, setClosingBalanceInput] = useState("");
  const [closedSessionResult, setClosedSessionResult] = useState<any>(null);

  // States for Movements
  const [movementType, setMovementType] = useState<"IN" | "OUT">("OUT");
  const [movementAmount, setMovementAmount] = useState("");
  const [movementReason, setMovementReason] = useState("");

  // States for Detailed Closing
  const [closingMode, setClosingMode] = useState<"SIMPLE" | "DETAILED">("SIMPLE");
  const [denominations, setDenominations] = useState<Record<string, number>>({
    '100': 0, '50': 0, '20': 0, '10': 0, '5': 0, '1': 0, '0.5': 0, '0.25': 0, '0.1': 0, '0.05': 0, '0.01': 0
  });

  const totalDenominations = Object.entries(denominations).reduce((sum, [val, qty]) => sum + parseFloat(val) * qty, 0);

  useEffect(() => {
    if (closingMode === "DETAILED") {
      setClosingBalanceInput(totalDenominations.toFixed(2));
    }
  }, [denominations, closingMode, totalDenominations]);

  // Cálculos de desglose de efectivo para transparencia total
  const cashBreakdown = useMemo(() => {
    if (!activeSession) return { sales: 0, others: 0 };
    const movements = activeSession.movements || [];
    const sales = movements
      .filter(m => m.reason.startsWith("Venta POS"))
      .reduce((acc, m) => acc + (m.type === "IN" ? m.amount : -m.amount), 0);
    const others = movements
      .filter(m => !m.reason.startsWith("Venta POS"))
      .reduce((acc, m) => acc + (m.type === "IN" ? m.amount : -m.amount), 0);
    return { sales, others };
  }, [activeSession]);

  // Un ADMIN puede operar el POS sin necesidad de abrir caja.
  // Solo los VENDEDOR están obligados a tener una sesión activa.
  const requiresCashSession = !isAdmin;
  const canOperate = isAdmin || !!activeSession;

  const checkSession = async (branchId: string, adminRole: boolean) => {
    if (!branchId) return;
    setCheckingSession(true);
    try {
      const res = await fetch(`/api/admin/cash/active?branchId=${branchId}`);
      const data = await res.json();
      setActiveSession(data);
      // Evitar forzar apertura de caja para Vendedores si están viendo la Tienda Online
      // (Aunque normalmente un vendedor no debería ver Tienda Online, por seguridad lo validamos).
      // Aquí usamos isOnlineStore derivado del branch actual.
      // Pero mejor, hacemos el chequeo solo cuando NO es Tienda Online y NO es admin.
    } catch (e) {
      console.error("Error checking session", e);
    } finally {
      setCheckingSession(false);
    }
  };

  useEffect(() => {
    const profile = getAdminProfile();
    const adminRole = profile.role === "ADMIN";
    setIsAdmin(adminRole);
    
    Promise.all([
      fetch("/api/admin/branches").then(r => r.json()),
      fetch("/api/admin/products").then(r => r.json())
    ]).then(([b, p]) => {
      // Mostrar todas las sucursales, incluyendo "tienda-online"
      const allBranches = b as Branch[];
      setBranches(allBranches);
      setProducts(p.filter((prod: any) => !prod.deleted));
      
      let bid = "";
      if (profile.role === "VENDEDOR" && profile.branchId) {
        bid = profile.branchId;
      } else if (allBranches.length > 0) {
        bid = allBranches[0].id;
      }
      setSelectedBranchId(bid);
      if (bid) checkSession(bid, adminRole);
      else setCheckingSession(false);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Sincronización en tiempo real (Server-Sent Events)
  // Mantiene actualizados los saldos de caja y el inventario entre vendedores y admins (Push Reactivo)
  useEffect(() => {
    if (!selectedBranchId) return;

    const syncData = async () => {
      try {
        const [sessionRes, productsRes] = await Promise.all([
          fetch(`/api/admin/cash/active?branchId=${selectedBranchId}`),
          fetch("/api/admin/products")
        ]);
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          setActiveSession(sessionData);
        }
        if (productsRes.ok) {
          const productsData = await productsRes.json();
          setProducts(productsData.filter((prod: any) => !prod.deleted));
        }
      } catch (e) {
        // Fallar silenciosamente si hay problemas de red
      }
    };

    const eventSource = new EventSource("/api/admin/events");

    eventSource.addEventListener("pos_update", () => {
       syncData();
    });

    eventSource.onerror = () => {
       console.warn("SSE eventSource connection interrupted/reconnecting...");
    };

    return () => {
       eventSource.close();
    };
  }, [selectedBranchId]);

  const handleOpenCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    try {
      const res = await fetch("/api/admin/cash/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: selectedBranchId,
          openingBalance: parseFloat(openingBalanceInput) || 0,
          notes: "Apertura desde POS"
        })
      });
      if (!res.ok) throw new Error("Error al abrir caja");
      const data = await res.json();
      setActiveSession(data);
      setShowOpeningModal(false);
      setOpeningBalanceInput("");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleCloseCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;
    setProcessing(true);
    try {
      const res = await fetch("/api/admin/cash/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSession.id,
          actualClosingBalance: parseFloat(closingBalanceInput) || 0,
          notes: "Cierre desde POS"
        })
      });
      const data = await res.json();
      setActiveSession(null);
      setShowClosingModal(false);
      setClosingBalanceInput("");
      setClosedSessionResult(data);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;
    setProcessing(true);
    try {
      const res = await fetch("/api/admin/cash/movement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSession.id,
          type: movementType,
          amount: parseFloat(movementAmount) || 0,
          reason: movementReason
        })
      });
      if (!res.ok) throw new Error("Error al registrar movimiento");
      
      setToast({ message: "Movimiento registrado", type: "success" });
      setShowMovementModal(false);
      setMovementAmount("");
      setMovementReason("");
    } catch (err: any) {
      setToast({ message: err.message, type: "error" });
    } finally {
      setProcessing(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  const displayProducts = useMemo(() => {
    return products.filter(p => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      const inv = p.inventories?.find(i => i.branchId === selectedBranchId);
      return inv && inv.stock > 0;
    });
  }, [products, search, selectedBranchId]);

  const addToCart = (product: Product) => {
    if (!canOperate) {
      setShowOpeningModal(true);
      return;
    }
    const inv = product.inventories?.find(i => i.branchId === selectedBranchId);
    const maxStock = inv?.stock || 0;

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= maxStock) return prev;
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const modifyQuantity = (productId: string, change: number) => {
    const product = products.find(p => p.id === productId);
    const inv = product?.inventories?.find(i => i.branchId === selectedBranchId);
    const maxStock = inv?.stock || 0;

    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const newQty = item.quantity + change;
        if (newQty <= 0) return item;
        if (newQty > maxStock) return item;
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const total = Math.max(0, subtotal - discount);

  const handleCheckout = async () => {
    if (cart.length === 0 || !canOperate) return;
    setProcessing(true);
    
    const orderData = {
      customer: "Cliente Mostrador",
      email: "local@blush.com",
      status: "completed",
      shippingMethod: "pickup",
      branchId: selectedBranchId,
      cashSessionId: activeSession?.id ?? null,
      paymentMethod,
      subtotal,
      total,
      shipping: 0,
      tax: 0,
      notes: "Venta física de mostrador",
      items: cart.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      }))
    };

    try {
      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || "Error procesando orden");
      }

      // Si fue pago en efectivo Y hay sesión activa, registrar movimiento en caja
      if (paymentMethod === "cash" && activeSession) {
          await fetch("/api/admin/cash/movement", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  sessionId: activeSession.id,
                  type: "IN",
                  amount: total,
                  reason: `Venta POS #${orderData.customer}`
              })
          });
          // Actualizar localmente el balance esperado
          setActiveSession(prev => prev ? { ...prev, expectedClosingBalance: prev.expectedClosingBalance + total } : null);
      }

      setCart([]);
      setDiscount(0);
      setCashTendered("");
      setToast({ message: "Venta registrada exitosamente", type: "success" });
      
      setProducts(prev => prev.map(p => {
        const cartItem = cart.find(c => c.id === p.id);
        if (cartItem) {
          const newInv = p.inventories?.map(inv => 
            inv.branchId === selectedBranchId ? { ...inv, stock: inv.stock - cartItem.quantity } : inv
          );
          return { ...p, inventories: newInv };
        }
        return p;
      }));

    } catch (e: any) {
      setToast({ message: e.message, type: "error" });
    } finally {
      setProcessing(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  if (loading || checkingSession) {
    return <div className="flex h-full items-center justify-center p-20"><div className="w-8 h-8 border-2 border-[#33172c] border-t-transparent rounded-full animate-spin"/></div>;
  }

  const isOnlineStore = branches.find(b => b.id === selectedBranchId)?.name === "tienda-online";

  return (
    <>
    <div className="flex h-[calc(100vh-56px)] lg:h-screen bg-gray-100 overflow-hidden print:hidden">
      
      {/* LEFT: CAJA REGISTRADORA */}
      <div className="w-full lg:w-[400px] flex-shrink-0 bg-white border-r border-gray-200 flex flex-col z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        {/* Header POS */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h1 className="text-sm font-bold text-gray-800">Caja Actual</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
               <span className={`w-2 h-2 rounded-full ${isOnlineStore ? "bg-blue-500" : activeSession ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`}></span>
               <p className="text-[10px] text-gray-400 font-medium">
                 {isOnlineStore ? "Venta directa sin apertura" : activeSession ? `Abierta por ${activeSession.admin?.name ?? ""}` : "Cerrada / Sin apertura"}
               </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isOnlineStore && (
              activeSession ? (
                  <>
                    <button onClick={() => setShowMovementModal(true)} className="px-2 py-1 bg-blue-50 text-blue-600 rounded-md text-[10px] font-bold uppercase hover:bg-blue-100 transition-all">
                       Movimiento
                    </button>
                    <button onClick={() => setShowClosingModal(true)} className="px-2 py-1 bg-red-50 text-red-600 rounded-md text-[10px] font-bold uppercase hover:bg-red-100 transition-all">
                       Cerrar Caja
                    </button>
                  </>
              ) : (
                  <button onClick={() => setShowOpeningModal(true)} className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-md text-[10px] font-bold uppercase hover:bg-emerald-100 transition-all">
                     Abrir Caja
                  </button>
              )
            )}
            {branches.length > 1 && isAdmin && (
                <select 
                value={selectedBranchId}
                onChange={(e) => {
                    const newId = e.target.value;
                    setSelectedBranchId(newId);
                    setCart([]);
                    checkSession(newId, true);
                }}
                className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-[10px] font-bold text-gray-700 outline-none"
                >
                {branches.map(b => <option key={b.id} value={b.id}>{b.name === "tienda-online" ? "Tienda Online" : b.name}</option>)}
                </select>
            )}
          </div>
        </div>

        {/* Cart List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 relative">
          {!canOperate && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center p-8 text-center">
                  <span className="material-symbols-outlined text-red-400 text-4xl mb-3">lock</span>
                  <p className="text-sm font-bold text-gray-800">Caja Cerrada</p>
                  <p className="text-xs text-gray-500 mt-1 mb-4">Debes realizar la apertura de caja para procesar ventas en esta sucursal.</p>
                  <button onClick={() => setShowOpeningModal(true)} className="bg-[#33172c] text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider shadow-lg">Abrir ahora</button>
              </div>
          )}
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6">
              <span className="material-symbols-outlined text-gray-200 text-5xl mb-2">shopping_basket</span>
              <p className="text-gray-400 text-sm">Escanea o selecciona productos a la derecha para agregar a la venta.</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm relative group">
                <button disabled={!canOperate} onClick={() => removeFromCart(item.id)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-100 text-red-500 rounded-full text-[12px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="material-symbols-outlined text-[10px] font-bold">close</span>
                </button>
                <div className="w-12 h-12 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0 relative">
                  {item.image ? <Image src={item.image} alt={item.name} fill className="object-cover" /> : <span className="material-symbols-outlined m-auto text-gray-300">image</span>}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <p className="text-xs font-bold text-gray-800 truncate leading-tight pr-4">{item.name}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-[#33172c]">${item.price.toFixed(2)}</p>
                    <div className="flex items-center gap-2 bg-gray-50 rounded-md border border-gray-100">
                      <button disabled={!canOperate} onClick={() => modifyQuantity(item.id, -1)} className="w-6 h-6 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-l-md"><span className="material-symbols-outlined text-[14px]">remove</span></button>
                      <span className="text-xs font-mono font-medium min-w-[16px] text-center">{item.quantity}</span>
                      <button disabled={!canOperate} onClick={() => modifyQuantity(item.id, 1)} className="w-6 h-6 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-r-md"><span className="material-symbols-outlined text-[14px]">add</span></button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals & Checkout */}
        <div className="bg-gray-50 p-5 border-t border-gray-200">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-gray-500">
              <span className="cursor-pointer border-b border-dashed border-gray-300 hover:text-gray-800" onClick={() => { if(!canOperate) return; setDiscount(Number(window.prompt("Descuento en $:") || 0))}}>Aplicar Descuento</span>
              <span>-${discount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-end border-t border-gray-200 pt-2 mt-2">
              <span className="text-sm font-bold text-gray-800">Total a Cobrar</span>
              <span className="text-xl font-black text-[#33172c]">${total.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            {(["cash", "card", "transfer"] as const).map(met => (
              <button 
                key={met}
                disabled={!canOperate}
                onClick={() => setPaymentMethod(met)}
                className={`py-2 px-1 text-[11px] font-bold rounded-lg uppercase tracking-wider flex flex-col items-center gap-1 transition-all
                  ${paymentMethod === met ? "bg-[#33172c] text-white shadow-md" : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-100 disabled:opacity-50"}`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {met === "cash" ? "payments" : met === "card" ? "credit_card" : "account_balance"}
                </span>
                {met === "cash" ? "Efect." : met === "card" ? "Tarj." : "Transf."}
              </button>
            ))}
          </div>

          {paymentMethod === "cash" && (
            <div className="mb-4 bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Calculadora de Cambio</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="number"
                  disabled={!canOperate}
                  placeholder="Recibido..."
                  value={cashTendered}
                  onChange={(e) => setCashTendered(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-[#33172c]/20"
                />
                <button disabled={!canOperate} onClick={() => setCashTendered(total.toString())} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-bold text-gray-700 transition-colors">Exacto</button>
              </div>
              <div className="flex flex-wrap gap-1 mb-3">
                 {[5, 10, 20, 50, 100].map(bill => (
                    <button 
                      key={bill} 
                      disabled={!canOperate}
                      onClick={() => setCashTendered((parseFloat(cashTendered || "0") + bill).toString())}
                      className="flex-1 py-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded text-[11px] font-bold text-gray-600 transition-colors disabled:opacity-50"
                    >
                      +${bill}
                    </button>
                 ))}
                 <button 
                    disabled={!canOperate || !cashTendered}
                    onClick={() => setCashTendered("")}
                    className="flex-[1.2] py-1 bg-red-50 hover:bg-red-100 text-red-500 rounded text-[11px] font-bold transition-colors disabled:opacity-50"
                 >
                    Borrar
                 </button>
              </div>
              <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-100">
                <span className="text-gray-500 font-medium">Cambio:</span>
                <span className={`font-bold ${parseFloat(cashTendered || "0") >= total ? "text-emerald-600" : "text-gray-400"}`}>
                  ${Math.max(0, parseFloat(cashTendered || "0") - total).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || processing || !canOperate || (paymentMethod === "cash" && parseFloat(cashTendered || "0") < total)}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white py-3.5 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-colors"
          >
            {processing ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <span className="material-symbols-outlined text-[18px]">shopping_cart_checkout</span>}
            {processing ? "Procesando..." : "Confirmar Venta"}
          </button>
          
          {toast && (
            <div className={`mt-3 p-2.5 rounded-lg text-xs font-semibold text-center border ${toast.type === "success" ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-red-50 border-red-100 text-red-600"}`}>
              {toast.message}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: CATÁLOGO GRID */}
      <div className="flex-1 flex flex-col bg-[#f8f9fc] overflow-hidden hidden lg:flex">
        <div className="p-5 border-b border-gray-200 bg-white flex items-center justify-between">
          <div className="relative w-72">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
            <input 
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar producto..." 
              className="w-full bg-gray-50 border border-gray-100 rounded-full pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-[#33172c]/10 focus:bg-white outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-4">
             {(!isOnlineStore && activeSession) && (
                 <div className="flex flex-col items-right text-right">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Efectivo en Caja</p>
                    <p className="text-sm font-black text-emerald-600">${activeSession.expectedClosingBalance.toFixed(2)}</p>
                 </div>
             )}
             <div className="text-xs text-gray-400 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
                <span className="font-bold text-gray-600">{displayProducts.length}</span> disponibles
             </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {displayProducts.map(product => {
              const inv = product.inventories?.find(i => i.branchId === selectedBranchId);
              const stock = inv?.stock || 0;
              return (
                <div 
                  key={product.id} 
                  onClick={() => addToCart(product)}
                  className={`bg-white p-3 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-[#33172c]/20 cursor-pointer transition-all flex flex-col ${!canOperate ? "opacity-60 grayscale-[0.5]" : ""}`}
                >
                  <div className="w-full pt-[100%] relative bg-gray-50 rounded-xl overflow-hidden mb-3">
                    {product.image ? (
                      <Image src={product.image} alt={product.name} fill className="object-cover" />
                    ) : (
                      <span className="material-symbols-outlined absolute inset-0 flex items-center justify-center text-gray-300">image</span>
                    )}
                    <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-1.5 py-0.5 rounded-md text-[10px] font-bold shadow-sm border border-black/5">
                      {stock} unidades
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                     <p className="text-xs font-bold text-gray-800 leading-snug mb-1 line-clamp-2">{product.name}</p>
                     <p className="text-sm font-black text-[#33172c]">${product.price.toFixed(2)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* OPENING MODAL */}
      {showOpeningModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-8 animate-in zoom-in duration-300">
                  <div className="text-center mb-6">
                      <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                          <span className="material-symbols-outlined text-4xl">account_balance_wallet</span>
                      </div>
                      <h2 className="text-xl font-black text-gray-800">Apertura de Caja</h2>
                      <p className="text-sm text-gray-500 mt-1">Ingresa el monto inicial para comenzar a vender.</p>
                  </div>
                  <form onSubmit={handleOpenCaja} className="space-y-4">
                      <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] block mb-2">Monto inicial (Base)</label>
                          <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                              <input 
                                required 
                                type="number" 
                                min="0" 
                                step="0.01"
                                autoFocus
                                value={openingBalanceInput}
                                onChange={e => setOpeningBalanceInput(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-8 pr-4 py-4 text-xl font-black text-gray-800 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-center"
                                placeholder="0.00"
                              />
                          </div>
                      </div>
                      <button 
                        type="submit"
                        disabled={processing}
                        className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                          {processing ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : "Iniciar Turno"}
                      </button>
                      <p className="text-[10px] text-gray-400 text-center px-4 leading-relaxed mt-4">
                          Al iniciar turno, tu nombre y hora quedarán registrados como responsable de esta caja.
                      </p>
                  </form>
              </div>
          </div>
      )}

      {/* MOVEMENT MODAL */}
      {showMovementModal && activeSession && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-8 animate-in zoom-in duration-300">
                  <div className="text-center mb-6">
                      <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                          <span className="material-symbols-outlined text-4xl">swap_horiz</span>
                      </div>
                      <h2 className="text-xl font-black text-gray-800">Caja Chica</h2>
                      <p className="text-sm text-gray-500 mt-1">Registra retiros o ingresos durante el turno.</p>
                  </div>
                  <form onSubmit={handleMovement} className="space-y-4">
                      <div className="flex bg-gray-100 p-1 rounded-xl">
                          <button type="button" onClick={() => setMovementType("OUT")} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${movementType === "OUT" ? "bg-white shadow-sm text-red-600" : "text-gray-500"}`}>Retiro (Gasto)</button>
                          <button type="button" onClick={() => setMovementType("IN")} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${movementType === "IN" ? "bg-white shadow-sm text-emerald-600" : "text-gray-500"}`}>Ingreso</button>
                      </div>
                      <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Monto</label>
                          <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                              <input 
                                required type="number" min="0.01" step="0.01" value={movementAmount} onChange={e => setMovementAmount(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-8 pr-4 py-3 text-lg font-black text-gray-800 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-center"
                                placeholder="0.00"
                              />
                          </div>
                      </div>
                      <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Motivo / Descripción</label>
                          <input 
                            required type="text" value={movementReason} onChange={e => setMovementReason(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-semibold text-gray-800 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                            placeholder="Ej. Compra de agua..."
                          />
                      </div>
                      <div className="flex gap-3 mt-6">
                          <button type="button" onClick={() => setShowMovementModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold tracking-widest">Cancelar</button>
                          <button type="submit" disabled={processing} className="flex-[2] bg-blue-600 text-white py-3 rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center">
                              {processing ? "..." : "Confirmar"}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* CLOSING MODAL */}
      {showClosingModal && activeSession && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
             <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm animate-in fade-in zoom-in duration-300 max-h-[92vh] overflow-y-auto custom-scrollbar overflow-x-hidden">
                <div className="bg-[#33172c] p-4 text-white text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full -mr-20 -mt-20"></div>
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full -ml-12 -mb-12"></div>
                    </div>
                    <h2 className="text-base font-black uppercase tracking-widest">Cierre de Caja</h2>
                    
                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                            <p className="text-[8px] font-bold uppercase opacity-50 tracking-widest">Fondo</p>
                            <p className="text-sm font-black">${activeSession.openingBalance.toFixed(2)}</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                            <p className="text-[8px] font-bold uppercase opacity-50 tracking-widest">Ventas</p>
                            <p className="text-sm font-black text-emerald-300">
                                +${cashBreakdown.sales.toFixed(2)}
                            </p>
                        </div>
                    </div>
                    
                    <div className="mt-3 flex items-center justify-between px-2">
                        <div className="text-left">
                           <p className="text-[8px] font-bold uppercase opacity-50 tracking-widest">Total Esperado</p>
                           <p className="text-2xl font-black">${activeSession.expectedClosingBalance.toFixed(2)}</p>
                        </div>
                        {cashBreakdown.others !== 0 && (
                            <div className="text-right">
                                 <p className="text-[8px] font-bold uppercase opacity-50 tracking-widest">Movs Extras</p>
                                 <p className="text-[10px] font-bold">{cashBreakdown.others > 0 ? "+" : ""}${cashBreakdown.others.toFixed(2)}</p>
                            </div>
                        )}
                    </div>
                </div>
                
                <form onSubmit={handleCloseCaja} className="p-5 space-y-4">
                    <div className="flex bg-gray-100 p-1 rounded-xl mb-4">
                        <button type="button" onClick={() => setClosingMode("SIMPLE")} className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors ${closingMode === "SIMPLE" ? "bg-white shadow-sm text-gray-800" : "text-gray-400"}`}>Ingreso Manual</button>
                        <button type="button" onClick={() => setClosingMode("DETAILED")} className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors ${closingMode === "DETAILED" ? "bg-white shadow-sm text-gray-800" : "text-gray-400"}`}>Arqueo Billetes</button>
                    </div>

                    {closingMode === "SIMPLE" ? (
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 text-center">Efectivo físicamente en caja</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                                <input 
                                    required 
                                    type="number" 
                                    min="0" 
                                    step="0.01"
                                    autoFocus
                                    value={closingBalanceInput}
                                    onChange={e => setClosingBalanceInput(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-8 pr-4 py-4 text-2xl font-black text-gray-800 outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all text-center"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                    ) : (
                        <div>
                            <div className="max-h-56 overflow-y-auto pr-1 space-y-1.5 mb-3 custom-scrollbar">
                                {Object.keys(denominations).sort((a,b) => parseFloat(b) - parseFloat(a)).map(val => (
                                    <div key={val} className="flex justify-between items-center bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
                                        <span className="text-xs font-bold text-gray-600">${val}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-gray-400">x</span>
                                            <input 
                                                type="number" min="0" step="1"
                                                value={denominations[val] || ""}
                                                onChange={e => setDenominations(p => ({ ...p, [val]: parseInt(e.target.value) || 0 }))}
                                                className="w-16 bg-white border border-gray-200 rounded-md text-center text-xs font-bold py-1.5 outline-none focus:border-red-400"
                                                placeholder="0"
                                            />
                                            <span className="w-14 text-right text-xs font-black text-gray-800">${(parseFloat(val) * (denominations[val] || 0)).toFixed(2)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="bg-gray-800 text-white rounded-xl p-2.5 text-center shadow-lg">
                                <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 block mb-0.5">Suma Total</span>
                                <span className="text-xl font-black">${totalDenominations.toFixed(2)}</span>
                            </div>
                        </div>
                    )}

                    <div className="bg-gray-50 rounded-xl p-3 flex justify-between items-center text-[10px]">
                        <span className="text-gray-500 font-bold uppercase tracking-tight">Diferencia:</span>
                        <span className={`font-black text-xs ${(parseFloat(closingBalanceInput || "0") - activeSession.expectedClosingBalance) === 0 ? "text-gray-400" : (parseFloat(closingBalanceInput || "0") - activeSession.expectedClosingBalance) > 0 ? "text-emerald-500" : "text-rose-500"}`}>
                            ${(parseFloat(closingBalanceInput || "0") - activeSession.expectedClosingBalance).toFixed(2)}
                        </span>
                    </div>

                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={() => setShowClosingModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl text-[9px] font-bold uppercase tracking-widest">Cancelar</button>
                        <button 
                            type="submit" 
                            disabled={processing}
                            className="flex-[2] bg-[#33172c] text-white py-3 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-[#33172c]/20"
                        >
                            {processing ? "..." : "Finalizar Turno"}
                        </button>
                    </div>
                </form>
            </div>
          </div>
      )}
      
      {/* SUCCESS CERRAR CAJA MODAL */}
      {closedSessionResult && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 print:hidden">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-8 text-center animate-in zoom-in duration-300">
                  <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                      <span className="material-symbols-outlined text-5xl">check_circle</span>
                  </div>
                  <h2 className="text-2xl font-black text-gray-800 mb-2">Caja Cerrada</h2>
                  <p className="text-sm text-gray-500 mb-6">Tu turno ha finalizado correctamente.</p>
                  
                  <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Fondo e Ingresos</p>
                          <p className="text-sm font-black text-gray-800">${closedSessionResult.expectedClosingBalance.toFixed(2)}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Efec. Real</p>
                          <p className="text-sm font-black text-gray-800">${closedSessionResult.actualClosingBalance.toFixed(2)}</p>
                      </div>
                  </div>
                  
                  <div className="bg-rose-50 rounded-2xl p-4 mb-6 border border-rose-100">
                      <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-1">Diferencia Final</p>
                      <p className={`text-2xl font-black ${closedSessionResult.difference === 0 ? "text-gray-800" : closedSessionResult.difference > 0 ? "text-emerald-500" : "text-rose-500"}`}>
                        {closedSessionResult.difference > 0 ? "+" : ""}{(closedSessionResult.difference || 0).toFixed(2)}
                      </p>
                  </div>

                  <div className="space-y-3">
                      <button onClick={() => window.print()} className="w-full py-4 bg-[#33172c] text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-[#33172c]/20 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2">
                          <span className="material-symbols-outlined text-[18px]">print</span>
                          Imprimir Corte Z
                      </button>
                      <button onClick={() => { setClosedSessionResult(null); setShowOpeningModal(true); }} className="w-full py-3 bg-white border-2 border-gray-100 text-gray-700 rounded-2xl text-[11px] font-bold uppercase tracking-widest hover:bg-gray-50 transition-colors">
                          Continuar (Nueva Caja)
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>


      {/* TICKET IMPRESORA TÉRMICA (Corte Z POS) */}
      {closedSessionResult && (
        <div className="hidden print:block print:w-[80mm] print:m-0 print:p-4 text-black text-sm bg-white" style={{ fontFamily: "monospace" }}>
          <div>
            <div className="text-center mb-4 pb-4 border-b border-black border-dashed">
               <h1 className="text-xl font-bold uppercase mb-1">CORTE Z</h1>
               <p className="text-sm">Sucursal: {closedSessionResult.branch?.name || "Tienda"}</p>
               <p className="text-xs mt-1">Ticket #: {closedSessionResult.id.slice(-6).toUpperCase()}</p>
            </div>
            
            <div className="mb-4 text-xs font-bold space-y-1">
               <p>Cajero: {closedSessionResult.admin?.name || "Desconocido"}</p>
               <p>Apertura: {new Date(closedSessionResult.openedAt).toLocaleString()}</p>
               <p>Cierre: {new Date(closedSessionResult.closedAt).toLocaleString()}</p>
            </div>

            <div className="mb-4 pb-4 border-b border-black border-dashed">
               <div className="flex justify-between font-bold mb-1"><span className="uppercase">Fondo Inicial:</span><span>${closedSessionResult.openingBalance.toFixed(2)}</span></div>
               <div className="flex justify-between font-bold mb-1">
                  <span className="uppercase">Ventas Netas:</span>
                  <span>
                    ${(closedSessionResult.movements?.filter((m:any) => m.reason.startsWith("Venta POS")).reduce((a:number,m:any)=>a+(m.type==="IN"?m.amount:-m.amount),0) || 0).toFixed(2)}
                  </span>
               </div>
               <div className="flex justify-between font-bold mb-1">
                  <span className="uppercase">Otros Movs:</span>
                  <span>
                    ${(closedSessionResult.movements?.filter((m:any) => !m.reason.startsWith("Venta POS")).reduce((a:number,m:any)=>a+(m.type==="IN"?m.amount:-m.amount),0) || 0).toFixed(2)}
                  </span>
               </div>
               <div className="flex justify-between font-bold mt-3 text-[16px]"><span className="uppercase">Total General:</span><span>${closedSessionResult.expectedClosingBalance.toFixed(2)}</span></div>
            </div>

            <div className="mb-4 pb-4 border-b border-black border-dashed">
                <div className="flex justify-between font-bold mb-1"><span className="uppercase">Efectivo Físico:</span><span>${closedSessionResult.actualClosingBalance.toFixed(2)}</span></div>
                <div className="flex justify-between font-bold mt-2 text-lg"><span className="uppercase">Diferencia:</span><span>{closedSessionResult.difference > 0 ? "+" : ""}{(closedSessionResult.difference).toFixed(2)}</span></div>
            </div>

            {closedSessionResult.movements && closedSessionResult.movements.length > 0 && (
              <div className="mb-4">
                 <p className="text-center font-bold uppercase mb-2 border-b border-black border-solid pb-1">Movimientos (Caja Chica)</p>
                 {closedSessionResult.movements.map((m: any) => (
                   <div key={m.id} className="flex justify-between text-xs mb-1">
                     <span className="truncate w-3/4">{m.type === "IN" ? "+" : "-"}{m.reason.slice(0,20)}</span>
                     <span className="font-bold w-1/4 text-right">${m.amount.toFixed(2)}</span>
                   </div>
                 ))}
              </div>
            )}

            <div className="text-center mt-8 pt-8">
               <p className="border-t border-black inline-block px-8 pb-2 mt-4 text-xs font-bold uppercase">{closedSessionResult.admin?.name || "Firma de Conformidad"}</p>
               <p className="text-[10px]">Firma Cajero</p>
            </div>
            
            <p className="text-center text-[10px] mt-8 uppercase font-bold">-- FIN DEL REPORTE --</p>
          </div>
        </div>
      )}
    </>
  );
}
