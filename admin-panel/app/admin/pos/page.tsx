"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { getAdminProfile } from "@/components/ProfileModal";

interface Branch { id: string; name: string; }
interface Product { id: string; name: string; price: number; image: string; inventories?: { branchId: string; stock: number }[]; isBundle?: boolean; taxRate?: number; }

interface BundleItem { productId: string; quantity: number; product: { id: string; name: string; price: number; image?: string | null }; }
interface Bundle {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  taxRate?: number;
  image?: string | null;
  active: boolean;
  stockDisponible: number;
  ahorroPercent: number;
  items: BundleItem[];
  branchIds: string[];
}

// CartItem puede ser un producto normal o un Bundle (identificado por isBundle: true)
interface CartItem extends Product { quantity: number; isBundle?: boolean; bundleId?: string; bundleItems?: BundleItem[]; }
interface CashSession {
  id: string;
  status: "OPEN" | "CLOSED";
  openingBalance: number;
  expectedClosingBalance: number;
  admin: { name: string };
  movements?: { amount: number; reason: string; type: "IN" | "OUT" }[];
}
interface Customer { id?: string; name: string; email: string; phone?: string; cedula?: string; }
const DEFAULT_CUSTOMER: Customer = { name: "Consumidor Final", email: "local@blush.com", cedula: "" };

export default function POSPage() {
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [activeSession, setActiveSession] = useState<CashSession | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [catalogTab, setCatalogTab] = useState<"products" | "bundles">("products");
  
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "transfer">("cash");
  const [cashTendered, setCashTendered] = useState<string>("");
  const [toast, setToast] = useState<{message: string, type: "success" | "error"} | null>(null);

  // Responsive state for mobile
  const [activeTab, setActiveTab] = useState<"CART" | "CATALOG">("CATALOG");

  // Modals
  const [showOpeningModal, setShowOpeningModal] = useState(false);
  const [showClosingModal, setShowClosingModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [openingBalanceInput, setOpeningBalanceInput] = useState("");
  const [closingBalanceInput, setClosingBalanceInput] = useState("");
  const [closedSessionResult, setClosedSessionResult] = useState<any>(null);

  // CRM States
  const [selectedCustomer, setSelectedCustomer] = useState<Customer>(DEFAULT_CUSTOMER);
  const [showCRMModal, setShowCRMModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState<Customer>({ name: "", email: "", phone: "", cedula: "" });

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
  // La sucursal "tienda-online" tampoco requiere caja (no maneja efectivo físico).
  // Solo los VENDEDOR en sucursales físicas están obligados a tener una sesión activa.
  const isOnlineBranch = branches.find(b => b.id === selectedBranchId)?.name === "tienda-online";
  const canOperate = isAdmin || isOnlineBranch || !!activeSession;

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
      fetch("/api/admin/products").then(r => r.json()),
      fetch("/api/admin/customers").then(r => r.json()),
      fetch("/api/admin/bundles").then(r => r.json()).catch(() => []),
    ]).then(([b, p, c, bun]) => {
      const allBranches = b as Branch[];
      setBranches(allBranches);
      setProducts(p.filter((prod: any) => !prod.deleted));
      setCustomerResults(c);
      setBundles((Array.isArray(bun) ? bun : []).filter((b: Bundle) => b.active));

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
        const [sessionRes, productsRes, bundlesRes] = await Promise.all([
          fetch(`/api/admin/cash/active?branchId=${selectedBranchId}`),
          fetch("/api/admin/products"),
          fetch("/api/admin/bundles").catch(() => null),
        ]);
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          setActiveSession(sessionData);
        }
        if (productsRes.ok) {
          const productsData = await productsRes.json();
          setProducts(productsData.filter((prod: any) => !prod.deleted));
        }
        if (bundlesRes && bundlesRes.ok) {
          const bundlesData = await bundlesRes.json();
          setBundles((Array.isArray(bundlesData) ? bundlesData : []).filter((b: Bundle) => b.active));
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
      if (p.isBundle) return false;
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
      const existing = prev.find(item => item.id === product.id && !item.isBundle);
      if (existing) {
        if (existing.quantity >= maxStock) return prev;
        return prev.map(item => item.id === product.id && !item.isBundle ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const addBundleToCart = (bundle: Bundle) => {
    if (!canOperate) {
      setShowOpeningModal(true);
      return;
    }
    if (bundle.stockDisponible <= 0) return;

    setCart(prev => {
      const existing = prev.find(item => item.isBundle && item.bundleId === bundle.id);
      if (existing) {
        if (existing.quantity >= bundle.stockDisponible) return prev;
        return prev.map(item =>
          item.isBundle && item.bundleId === bundle.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      // Representar el bundle como un CartItem sintético
      const syntheticItem: CartItem = {
        id: `bundle-${bundle.id}`,
        bundleId: bundle.id,
        isBundle: true,
        bundleItems: bundle.items,
        name: `🎁 ${bundle.name}`,
        price: bundle.price,
        taxRate: bundle.taxRate ?? 0,
        image: bundle.image || "",
        quantity: 1,
        inventories: [],
      };
      return [...prev, syntheticItem];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const modifyQuantity = (productId: string, change: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const newQty = item.quantity + change;
        if (newQty <= 0) return item;

        // Lógica separada para Bundles vs Productos normales
        if (item.isBundle) {
          const bundle = bundles.find(b => b.id === item.bundleId);
          const maxBundleStock = bundle ? bundle.stockDisponible : 0;
          if (newQty > maxBundleStock) return item;
        } else {
          const product = products.find(p => p.id === productId);
          const inv = product?.inventories?.find(i => i.branchId === selectedBranchId);
          const maxStock = inv?.stock || 0;
          if (newQty > maxStock) return item;
        }

        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = cart.reduce((sum, item) => {
    const itemTaxRate = item.taxRate ?? 0;
    return sum + ((item.price * item.quantity) * (itemTaxRate / 100));
  }, 0);
  const total = Math.max(0, subtotal + tax);

  const handleCheckout = async () => {
    if (cart.length === 0 || !canOperate) return;
    setProcessing(true);
    
    const orderData = {
      customer: selectedCustomer.name,
      email: selectedCustomer.email,
      cedula: selectedCustomer.cedula || null,
      status: "completed",
      shippingMethod: "pickup",
      branchId: selectedBranchId,
      cashSessionId: activeSession?.id ?? null,
      paymentMethod,
      subtotal,
      discount: 0,
      total,
      shipping: 0,
      tax: tax,
      notes: "Venta física de mostrador",
      items: cart.map(item => ({
        id: item.isBundle ? item.bundleId! : item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        isBundle: item.isBundle || false,
        bundleItems: item.isBundle ? item.bundleItems : undefined,
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

        // Solo dejamos la actualización visual para que el cajero vea su saldo subir al instante
        if (paymentMethod === "cash" && activeSession) {
          setActiveSession(prev => prev ? { ...prev, expectedClosingBalance: prev.expectedClosingBalance + total } : null);
        }

      setCart([]);
      setCashTendered("");
      setSelectedCustomer(DEFAULT_CUSTOMER);
      setToast({ message: "Venta registrada exitosamente", type: "success" });
      
      // Actualización optimista de inventario (sólo productos normales)
      // Actualización optimista de inventario (Agrupa sueltos y bundles)
      setProducts(prev => prev.map(p => {
        let totalToSubtract = 0;
        
        // Sumar ocurrencias individuales
        const singleCartItem = cart.find(c => !c.isBundle && c.id === p.id);
        if (singleCartItem) totalToSubtract += singleCartItem.quantity;
        
        // Sumar ocurrencias dentro de cualquier bundle
        cart.filter(c => c.isBundle).forEach(bundleCartItem => {
          const component = bundleCartItem.bundleItems?.find(bi => bi.productId === p.id);
          if (component) {
            totalToSubtract += (component.quantity * bundleCartItem.quantity);
          }
        });

        if (totalToSubtract > 0) {
          const newInv = p.inventories?.map(inv =>
            inv.branchId === selectedBranchId 
              ? { ...inv, stock: inv.stock - totalToSubtract } 
              : inv
          );
          return { ...p, inventories: newInv };
        }
        return p;
      }));
      // Actualizar stock disponible de bundles optimistamente
      setBundles(prev => prev.map(b => {
        const bCart = cart.find(c => c.isBundle && c.bundleId === b.id);
        if (bCart) return { ...b, stockDisponible: Math.max(0, b.stockDisponible - bCart.quantity) };
        return b;
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
    <div className="flex flex-col lg:flex-row h-[calc(100vh-56px)] lg:h-screen bg-gray-100 overflow-hidden print:hidden pb-[72px] lg:pb-0">
      
      {/* LEFT: CAJA REGISTRADORA */}
      <div className={`w-full lg:w-[400px] flex-1 lg:flex-none h-full bg-white border-r border-gray-200 flex-col z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)] ${activeTab === "CART" ? "flex" : "hidden lg:flex"}`}>
        {/* Seleccion de Cliente */}
        <div className="px-4 py-3 bg-white border-b border-gray-100">
           <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cliente</span>
              <button 
                onClick={() => setShowCRMModal(true)}
                className="text-[10px] font-bold text-[#33172c] hover:underline"
              >
                {selectedCustomer.email === DEFAULT_CUSTOMER.email ? "Seleccionar" : "Cambiar"}
              </button>
           </div>
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-[#bc93ad]">
                 <span className="material-symbols-outlined text-[18px]">person</span>
              </div>
              <div className="flex-1 min-w-0">
                 <p className="text-xs font-bold text-gray-800 truncate">{selectedCustomer.name}</p>
                 <p className="text-[10px] text-gray-400 truncate">
                    {selectedCustomer.cedula ? `ID: ${selectedCustomer.cedula}` : selectedCustomer.email}
                 </p>
              </div>
              {selectedCustomer.email !== DEFAULT_CUSTOMER.email && (
                <button onClick={() => setSelectedCustomer(DEFAULT_CUSTOMER)} className="text-gray-300 hover:text-rose-500 transition-colors">
                   <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              )}
           </div>
        </div>

        {/* Listado de carrito */}
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
        <div className="bg-gray-50 p-3 lg:p-5 border-t border-gray-200">
          <div className="space-y-1.5 lg:space-y-2 mb-3 lg:mb-4">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            {tax > 0 && (
              <div className="flex justify-between text-xs text-gray-500">
                <span>IVA</span>
                <span>${tax.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-end border-t border-gray-200 pt-2 mt-2">
              <span className="text-sm font-bold text-gray-800">Total a Cobrar</span>
              <span className="text-xl font-black text-[#33172c]">${total.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3 lg:mb-4">
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
            <div className="mb-3 lg:mb-4 bg-white border border-gray-200 rounded-xl p-2.5 lg:p-3 shadow-sm">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 lg:mb-2">Calculadora de Cambio</label>
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
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white py-3 lg:py-3.5 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-colors"
          >
            {processing ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <span className="material-symbols-outlined text-[18px]">shopping_cart_checkout</span>}
            {processing ? "Procesando..." : "Confirmar Venta"}
          </button>
          
          {toast && (
            <div className={`mt-3 p-2.5 rounded-lg text-xs font-semibold text-center border ${toast.type === "success" ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-red-50 border-red-100 text-red-600"}`}>
              {toast.message}
            </div>
          )}
          {isAdmin && !activeSession && !isOnlineBranch && paymentMethod === "cash" && cart.length > 0 && (
            <div className="mt-2 p-2.5 rounded-lg text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px]">warning</span>
              Sin caja abierta — este cobro en efectivo no quedará registrado.
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: CATÁLOGO GRID */}
      <div className={`flex-1 flex-col bg-[#f8f9fc] overflow-hidden ${activeTab === "CATALOG" ? "flex" : "hidden lg:flex"}`}>
        <div className="p-3 sm:p-5 border-b border-gray-200 bg-white flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 lg:max-w-72">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={catalogTab === "bundles" ? "Buscar bundle..." : "Buscar producto..."}
                className="w-full bg-gray-50 border border-gray-100 rounded-full pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-[#33172c]/10 focus:bg-white outline-none transition-all"
              />
            </div>
            <div className="flex items-center gap-4 hidden sm:flex">
               {(!isOnlineStore && activeSession) && (
                   <div className="flex flex-col items-right text-right">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Efectivo en Caja</p>
                      <p className="text-sm font-black text-emerald-600">${activeSession.expectedClosingBalance.toFixed(2)}</p>
                   </div>
               )}
               <div className="text-xs text-gray-400 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="font-bold text-gray-600">{catalogTab === "bundles" ? bundles.length : displayProducts.length}</span> disponibles
               </div>
            </div>
          </div>
          {/* Category tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setCatalogTab("products")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                catalogTab === "products"
                  ? "bg-[#33172c] text-white shadow-sm"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">inventory_2</span>
              Productos
            </button>
            {bundles.length > 0 && (
              <button
                onClick={() => setCatalogTab("bundles")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  catalogTab === "bundles"
                    ? "bg-[#33172c] text-white shadow-sm"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">deployed_code</span>
                Bundles ({bundles.length})
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 pb-4 lg:pb-5">
          {catalogTab === "products" ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
              {displayProducts
                .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()))
                .map(product => {
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
                  );
                })}
            </div>
          ) : (
            /* ── BUNDLES GRID ─────────────────────────────────────────── */
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {bundles
                .filter(b => !search || b.name.toLowerCase().includes(search.toLowerCase()))
                .filter(b => !b.branchIds || b.branchIds.length === 0 || b.branchIds.includes(selectedBranchId))
                .map(bundle => {
                  const inCart = cart.find(c => c.isBundle && c.bundleId === bundle.id);
                  const availableStock = bundle.stockDisponible - (inCart?.quantity ?? 0);
                  return (
                    <div
                      key={bundle.id}
                      onClick={() => addBundleToCart(bundle)}
                      className={`bg-white p-3 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-[#33172c]/20 cursor-pointer transition-all flex flex-col relative ${
                        availableStock <= 0 || !canOperate ? "opacity-60 grayscale-[0.5]" : ""
                      }`}
                    >
                      {/* Kit badge */}
                      <div className="absolute top-2 left-2 z-10 px-1.5 py-0.5 bg-violet-600 text-white text-[9px] font-bold rounded-md shadow">
                        KIT
                      </div>
                      <div className="w-full pt-[100%] relative bg-gradient-to-br from-violet-50 to-purple-100 rounded-xl overflow-hidden mb-3">
                        {bundle.image ? (
                          <Image src={bundle.image} alt={bundle.name} fill className="object-cover" />
                        ) : (
                          <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-1 p-2">
                            {bundle.items.slice(0, 4).map(bi =>
                              bi.product?.image ? (
                                <div key={bi.productId} className="relative w-10 h-10 rounded-lg overflow-hidden shadow-sm">
                                  <Image src={bi.product.image} alt={bi.product.name} fill className="object-cover" />
                                </div>
                              ) : (
                                <div key={bi.productId} className="w-10 h-10 rounded-lg bg-white/60 flex items-center justify-center">
                                  <span className="material-symbols-outlined text-[16px] text-violet-400">inventory_2</span>
                                </div>
                              )
                            )}
                          </div>
                        )}
                        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-1.5 py-0.5 rounded-md text-[10px] font-bold shadow-sm border border-black/5">
                          {availableStock} kits
                        </div>
                        {bundle.ahorroPercent > 0 && (
                          <div className="absolute bottom-2 right-2 bg-emerald-500 text-white px-1.5 py-0.5 rounded-md text-[9px] font-bold shadow-sm">
                            -{bundle.ahorroPercent}%
                          </div>
                        )}
                      </div>
                      <div className="flex-1 flex flex-col justify-between">
                        <p className="text-xs font-bold text-gray-800 leading-snug mb-1 line-clamp-2">{bundle.name}</p>
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-black text-[#33172c]">${bundle.price.toFixed(2)}</p>
                          {inCart && (
                            <span className="text-[10px] font-bold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-full">
                              ×{inCart.quantity} en caja
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              {bundles
                .filter(b => !search || b.name.toLowerCase().includes(search.toLowerCase()))
                .filter(b => !b.branchIds || b.branchIds.length === 0 || b.branchIds.includes(selectedBranchId))
                .length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-16 text-center text-gray-400">
                  <span className="material-symbols-outlined text-4xl mb-2 text-gray-200">deployed_code</span>
                  <p className="text-sm">No hay bundles activos disponibles</p>
                </div>
              )}
            </div>
          )}
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

    {/* CRM MODAL */}
    {showCRMModal && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in duration-200">
           <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h2 className="text-xl font-black text-gray-800">Gestionar Cliente</h2>
              <button onClick={() => { setShowCRMModal(false); setIsCreatingCustomer(false); }} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
           </div>
           
           <div className="p-6 overflow-y-auto">
              {!isCreatingCustomer ? (
                <div className="space-y-6">
                   <div className="relative">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                      <input 
                        className="w-full bg-gray-100 border-none rounded-2xl pl-12 pr-4 py-4 text-sm focus:ring-2 focus:ring-[#33172c]/10 outline-none transition-all"
                        placeholder="Buscar por nombre, email o cédula..."
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                      />
                   </div>

                   <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                      {customerResults
                        .filter(c => 
                          c.name.toLowerCase().includes(customerSearch.toLowerCase()) || 
                          c.email.toLowerCase().includes(customerSearch.toLowerCase()) ||
                          c.cedula?.includes(customerSearch)
                        )
                        .slice(0, 10)
                        .map(c => (
                          <button 
                            key={c.id} 
                            onClick={() => { setSelectedCustomer(c); setShowCRMModal(false); }}
                            className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-all text-left"
                          >
                             <div className="w-10 h-10 rounded-full bg-[#33172c]/5 flex items-center justify-center text-[#33172c]">
                                <span className="material-symbols-outlined">person</span>
                             </div>
                             <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-gray-800">{c.name}</p>
                                <p className="text-xs text-gray-400 truncate">{c.email} • {c.cedula || "S/N"}</p>
                             </div>
                             <span className="material-symbols-outlined text-gray-300">chevron_right</span>
                          </button>
                        ))
                      }
                      {customerSearch && customerResults.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase())).length === 0 && (
                        <p className="text-center py-8 text-sm text-gray-400">No se encontraron clientes</p>
                      )}
                   </div>

                   <div className="pt-4">
                      <button 
                        onClick={() => setIsCreatingCustomer(true)}
                        className="w-full py-4 bg-white border-2 border-dashed border-gray-200 text-gray-400 rounded-2xl text-[11px] font-bold uppercase tracking-widest hover:border-[#33172c] hover:text-[#33172c] transition-all flex items-center justify-center gap-2"
                      >
                         <span className="material-symbols-outlined text-[18px]">person_add</span>
                         Registrar Nuevo Cliente
                      </button>
                   </div>
                </div>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); setSelectedCustomer(newCustomer); setIsCreatingCustomer(false); setShowCRMModal(false); }} className="space-y-4">
                   <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                         <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Nombre Completo</label>
                         <input 
                            required
                            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:bg-white outline-none"
                            value={newCustomer.name}
                            onChange={e => setNewCustomer({...newCustomer, name: e.target.value})}
                         />
                      </div>
                      <div>
                         <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Cédula / ID</label>
                         <input 
                            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:bg-white outline-none"
                            value={newCustomer.cedula}
                            onChange={e => setNewCustomer({...newCustomer, cedula: e.target.value})}
                         />
                      </div>
                      <div>
                         <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Teléfono</label>
                         <input 
                            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:bg-white outline-none"
                            value={newCustomer.phone}
                            onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})}
                         />
                      </div>
                      <div className="col-span-2">
                         <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Email</label>
                         <input 
                            required
                            type="email"
                            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:bg-white outline-none"
                            value={newCustomer.email}
                            onChange={e => setNewCustomer({...newCustomer, email: e.target.value})}
                         />
                      </div>
                   </div>
                   <div className="flex gap-3 pt-4">
                      <button type="button" onClick={() => setIsCreatingCustomer(false)} className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl text-[11px] font-bold uppercase tracking-widest">Atrás</button>
                      <button type="submit" className="flex-[2] py-4 bg-[#33172c] text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-[#33172c]/20">Confirmar Cliente</button>
                   </div>
                </form>
              )}
           </div>
        </div>
      </div>
    )}

    {/* MOBILE NAVIGATION BAR */}
    <div className="lg:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 flex items-center justify-around p-2 z-[50] shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
      <button 
        onClick={() => setActiveTab("CATALOG")}
        className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all ${activeTab === "CATALOG" ? "text-[#33172c]" : "text-gray-400"}`}
      >
        <div className={`p-1.5 rounded-xl transition-all ${activeTab === "CATALOG" ? "bg-[#33172c]/5" : ""}`}>
          <span className="material-symbols-outlined text-[24px]">search</span>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider">Productos</span>
      </button>
      
      <button 
        onClick={() => setActiveTab("CART")}
        className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all relative ${activeTab === "CART" ? "text-[#33172c]" : "text-gray-400"}`}
      >
        <div className={`p-1.5 rounded-xl transition-all ${activeTab === "CART" ? "bg-[#33172c]/5" : ""}`}>
          <span className="material-symbols-outlined text-[24px]">shopping_cart</span>
          {cart.length > 0 && (
            <span className="absolute top-1 right-[30%] bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
              {cart.reduce((s, i) => s + i.quantity, 0)}
            </span>
          )}
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider">Caja (${total.toFixed(0)})</span>
      </button>
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
