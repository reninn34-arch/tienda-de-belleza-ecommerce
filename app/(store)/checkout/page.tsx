"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/context/CartContext";
import { useState, useEffect } from "react";

const TAX_RATE = 0.08; // fallback, overridden by settings

interface AdminShippingMethod { id: string; name: string; description: string; price: number; enabled: boolean; carrier?: string; }
interface AccountDetails { bank: string; accountNumber: string; accountType: string; holderName: string; ruc: string; email: string; }
interface AdminPaymentMethod { id: string; name: string; enabled: boolean; instructions: string; accountDetails?: AccountDetails; email?: string; }

export default function CheckoutPage() {
  const { cart, cartTotal, clearCart, isLoaded, validateCart } = useCart();
  const [submitted, setSubmitted] = useState(false);
  const [shippingMethod, setShippingMethod] = useState("standard");
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [discountCode, setDiscountCode] = useState("");
  const [shippingMethods, setShippingMethods] = useState<AdminShippingMethod[]>([
    { id: "standard", name: "Envío Estándar", description: "3–5 días hábiles", price: 5, enabled: true },
    { id: "express", name: "Envío Express", description: "1–2 días hábiles", price: 15, enabled: true },
  ]);
  const [paymentMethods, setPaymentMethods] = useState<AdminPaymentMethod[]>([]);
  const [confirmedTransfer, setConfirmedTransfer] = useState<AdminPaymentMethod | null>(null);
  const [taxRate, setTaxRate] = useState<number>(TAX_RATE);
  const [form, setForm] = useState({
    email: "",
    newsletter: false,
    country: "EC",
    firstName: "",
    lastName: "",
    idNumber: "",
    phone: "",
    address: "",
    apartment: "",
    city: "",
    province: "",
    zip: "",
    cardNumber: "",
    cardExpiry: "",
    cardCvc: "",
  });

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s) => {
        const enabledShipping = (s.shipping?.methods ?? []).filter((m: AdminShippingMethod) => m.enabled);
        const enabledPayments = (s.payments?.methods ?? []).filter((m: AdminPaymentMethod) => m.enabled);
        if (enabledShipping.length) {
          setShippingMethods(enabledShipping);
          setShippingMethod(enabledShipping[0]?.id ?? "standard");
        }
        if (enabledPayments.length) {
          setPaymentMethods(enabledPayments);
          setPaymentMethod(enabledPayments[0]?.id ?? "card");
        }
        if (s.taxRate !== undefined) setTaxRate(s.taxRate / 100);
      })
      .catch(() => {});
    
    // Auto-validate real-time stock on mount
    validateCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedShipping = shippingMethods.find((m) => m.id === shippingMethod) ?? shippingMethods[0];
  const shippingCost = selectedShipping?.price ?? 5;
  const tax = cart.reduce((sum, item) => {
    const itemTaxRate = item.taxRate ?? 0; // Usar el del producto o 0% por defecto
    return sum + (item.price * item.quantity * (itemTaxRate / 100));
  }, 0);
  const total = cartTotal + shippingCost + tax;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const transferMethod = paymentMethods.find((m) => m.id === "transfer" && m.id === paymentMethod) ?? null;
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: `${form.firstName} ${form.lastName}`,
          email: form.email,
          cedula: form.idNumber,
          phone: form.phone,
          total,
          subtotal: cartTotal,
          shipping: shippingCost,
          tax,
          status: "pending",
          shippingMethod: selectedShipping?.name ?? shippingMethod,
          paymentMethod,
          address: `${form.address}${form.apartment ? ", " + form.apartment : ""}, ${form.city}, ${form.province}, ${form.country}`,
          notes: "",
          products: cart.map((i) => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity, image: i.image, isBundle: i.isBundle })),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Error procesando el pedido.");
      }

      clearCart();
      setConfirmedTransfer(transferMethod);
      setSubmitted(true);
    } catch (e: any) {
      alert(e.message || "Ocurrió un error inesperado al procesar el pedido.");
    }
  };

  if (!isLoaded) {
    return (
      <div className="pt-32 pb-24 min-h-screen bg-background flex items-center justify-center">
        <span className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="pt-32 pb-24 min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md px-8">
          <span
            className="material-symbols-outlined text-6xl text-secondary mb-6 block"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            check_circle
          </span>
          <h1 className="font-headline text-4xl text-primary mb-4">Pedido Confirmado</h1>
          <p className="text-on-surface-variant font-light mb-8 leading-relaxed">
            Gracias por tu pedido. Recibirás un correo de confirmación en breve. Tu transformación
            alquímica comienza ahora.
          </p>
          {confirmedTransfer && (
            <div className="text-left bg-surface-container-low border border-outline-variant/30 rounded-xl p-6 mb-8">
              <p className="text-xs font-bold uppercase tracking-widest text-secondary mb-3">
                Instrucciones de Pago — Transferencia Bancaria
              </p>
              {confirmedTransfer.instructions && (
                <p className="text-sm text-on-surface-variant mb-4 leading-relaxed">{confirmedTransfer.instructions}</p>
              )}
              {confirmedTransfer.accountDetails && (
                <div className="space-y-2 bg-white border border-outline-variant/20 rounded-lg p-4">
                  {[
                    ["Banco", confirmedTransfer.accountDetails.bank],
                    ["N° de Cuenta", confirmedTransfer.accountDetails.accountNumber],
                    ["Tipo de Cuenta", confirmedTransfer.accountDetails.accountType],
                    ["Titular", confirmedTransfer.accountDetails.holderName],
                    ["RUC / CI", confirmedTransfer.accountDetails.ruc],
                    ["Enviar comprobante a", confirmedTransfer.accountDetails.email],
                  ].filter(([, v]) => v).map(([label, val]) => (
                    <div key={label} className="flex gap-3 text-sm">
                      <span className="text-outline min-w-[140px]">{label}:</span>
                      <span className="font-semibold text-primary">{val}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <Link
            href="/products"
            className="inline-block bg-primary text-white px-10 py-4 text-[11px] font-bold uppercase tracking-[0.2em] rounded-md hover:bg-primary-container transition-colors"
          >
            Continuar Comprando
          </Link>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="pt-32 pb-24 min-h-screen bg-background flex items-center justify-center">
        <div className="text-center px-8">
          <h1 className="font-headline text-4xl text-primary mb-4">Tu carrito está vacío</h1>
          <Link
            href="/products"
            className="text-secondary font-label text-xs uppercase tracking-[0.2em] font-bold hover:underline"
          >
            Explorar Archivo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-primary pt-20">
      {/* Sub-header */}
      <header className="w-full bg-white border-b border-outline-variant/20">
        <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center">
          <div className="text-xl font-headline italic text-primary">The Editorial Alchemist</div>
          <Link
            href="/cart"
            className="text-xs font-bold uppercase tracking-widest text-outline hover:text-primary transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">shopping_bag</span>
            Volver al Carrito
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">

          {/* ── Columna izquierda: Formulario ── */}
          <div className="lg:col-span-7">
            <form onSubmit={handleSubmit} className="space-y-12">

              {/* 1. Contacto */}
              <section>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="font-headline text-2xl text-primary">Contacto</h2>
                  <p className="text-sm text-outline">
                    ¿Ya tienes cuenta?{" "}
                    <a className="text-primary-container underline font-medium" href="#">
                      Inicia sesión
                    </a>
                  </p>
                </div>
                <div className="space-y-4">
                  <input
                    name="email"
                    value={form.email as string}
                    onChange={handleChange}
                    className="w-full bg-white border border-outline-variant rounded px-4 py-3 text-sm outline-none focus:border-primary-container transition-all"
                    placeholder="Correo electrónico"
                    required
                    type="email"
                  />
                  <input
                    name="phone"
                    value={form.phone as string}
                    onChange={handleChange}
                    className="w-full bg-white border border-outline-variant rounded px-4 py-3 text-sm outline-none focus:border-primary-container transition-all"
                    placeholder="Número de teléfono"
                    required
                    type="tel"
                  />
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      name="newsletter"
                      type="checkbox"
                      checked={form.newsletter as boolean}
                      onChange={handleChange}
                      className="rounded border-outline-variant text-primary-container focus:ring-primary-container"
                    />
                    <span className="text-sm text-outline">
                      Enviarme novedades y ofertas por correo
                    </span>
                  </label>
                </div>
              </section>

              {/* 2. Dirección de envío */}
              <section>
                <h2 className="font-headline text-2xl mb-6 text-primary">Dirección de envío</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <select
                      name="country"
                      value={form.country as string}
                      onChange={handleChange}
                      className="w-full bg-white border border-outline-variant rounded px-4 py-3 text-sm outline-none focus:border-primary-container"
                    >
                      <option value="EC">Ecuador</option>
                      <option value="US">Estados Unidos</option>
                      <option value="ES">España</option>
                      <option value="CO">Colombia</option>
                      <option value="MX">México</option>
                      <option value="PE">Perú</option>
                    </select>
                  </div>
                  <input
                    name="firstName"
                    value={form.firstName as string}
                    onChange={handleChange}
                    className="w-full bg-white border border-outline-variant rounded px-4 py-3 text-sm outline-none focus:border-primary-container transition-all"
                    placeholder="Nombre"
                    required
                    type="text"
                  />
                  <input
                    name="lastName"
                    value={form.lastName as string}
                    onChange={handleChange}
                    className="w-full bg-white border border-outline-variant rounded px-4 py-3 text-sm outline-none focus:border-primary-container transition-all"
                    placeholder="Apellido"
                    required
                    type="text"
                  />
                  <div className="md:col-span-2">
                    <input
                      name="idNumber"
                      value={form.idNumber as string}
                      onChange={handleChange}
                      className="w-full bg-white border border-outline-variant rounded px-4 py-3 text-sm outline-none focus:border-primary-container transition-all"
                      placeholder="Cédula / Número de Identificación"
                      required
                      type="text"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <input
                      name="address"
                      value={form.address as string}
                      onChange={handleChange}
                      className="w-full bg-white border border-outline-variant rounded px-4 py-3 text-sm outline-none focus:border-primary-container transition-all"
                      placeholder="Dirección"
                      required
                      type="text"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <input
                      name="apartment"
                      value={form.apartment as string}
                      onChange={handleChange}
                      className="w-full bg-white border border-outline-variant rounded px-4 py-3 text-sm outline-none focus:border-primary-container transition-all"
                      placeholder="Apartamento, suite, etc. (opcional)"
                      type="text"
                    />
                  </div>
                  <input
                    name="city"
                    value={form.city as string}
                    onChange={handleChange}
                    className="w-full bg-white border border-outline-variant rounded px-4 py-3 text-sm outline-none focus:border-primary-container transition-all"
                    placeholder="Ciudad"
                    required
                    type="text"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      name="province"
                      value={form.province as string}
                      onChange={handleChange}
                      className="w-full bg-white border border-outline-variant rounded px-4 py-3 text-sm outline-none focus:border-primary-container transition-all"
                      placeholder="Provincia"
                      required
                      type="text"
                    />
                    <input
                      name="zip"
                      value={form.zip as string}
                      onChange={handleChange}
                      className="w-full bg-white border border-outline-variant rounded px-4 py-3 text-sm outline-none focus:border-primary-container transition-all"
                      placeholder="Código Postal"
                      required
                      type="text"
                    />
                  </div>
                </div>
              </section>

              {/* 3. Método de envío */}
              <section>
                <h2 className="font-headline text-2xl mb-6 text-primary">Método de envío</h2>
                <div className="border border-outline-variant rounded-md overflow-hidden bg-white">
                  {shippingMethods.map((method, idx) => (
                    <label
                      key={method.id}
                      className={`flex items-center justify-between p-4 cursor-pointer hover:bg-surface-container-low transition-colors ${idx < shippingMethods.length - 1 ? "border-b border-outline-variant" : ""}`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="shipping_method"
                          value={method.id}
                          checked={shippingMethod === method.id}
                          onChange={() => setShippingMethod(method.id)}
                          className="text-primary-container focus:ring-primary-container"
                        />
                        <div>
                          <span className="text-sm font-medium block">
                            {method.name}
                            {method.carrier && <span className="ml-2 text-[10px] font-bold tracking-widest uppercase bg-surface-variant text-on-surface px-1.5 py-0.5 rounded">{method.carrier}</span>}
                          </span>
                          <span className="text-xs text-outline">{method.description}</span>
                        </div>
                      </div>
                      <span className="text-sm font-bold">{method.price === 0 ? "Gratis" : `$${method.price.toFixed(2)}`}</span>
                    </label>
                  ))}
                </div>
              </section>

              {/* 4. Pago */}
              <section>
                <div className="mb-6">
                  <h2 className="font-headline text-2xl text-primary">Pago</h2>
                  <p className="text-sm text-outline mt-1">
                    Todas las transacciones son seguras y están cifradas.
                  </p>
                </div>
                <div className="border border-outline-variant rounded-md overflow-hidden bg-white">
                  {paymentMethods.map((method, idx) => (
                    <div key={method.id} className={idx < paymentMethods.length - 1 ? "border-b border-outline-variant" : ""}>
                      <label className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${paymentMethod === method.id ? "bg-surface-container-low/60" : "hover:bg-surface-container-low/30"}`}>
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="payment_method"
                            value={method.id}
                            checked={paymentMethod === method.id}
                            onChange={() => setPaymentMethod(method.id)}
                            className="text-primary-container focus:ring-primary-container"
                          />
                          <span className="text-sm font-medium">{method.name}</span>
                        </div>
                        <span className="material-symbols-outlined text-outline text-xl">
                          {method.id === "card" ? "credit_card" : method.id === "transfer" ? "account_balance" : "payment"}
                        </span>
                      </label>

                      {paymentMethod === method.id && method.id === "card" && (
                        <div className="p-4 bg-surface-container-low/30 space-y-4 border-t border-outline-variant/30">
                          <div className="relative">
                            <input name="cardNumber" value={form.cardNumber as string} onChange={handleChange} className="w-full bg-white border border-outline-variant rounded px-4 py-3 text-sm outline-none focus:border-primary-container transition-all" placeholder="Número de tarjeta" maxLength={19} required type="text" />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline/50 text-sm">lock</span>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <input name="cardExpiry" value={form.cardExpiry as string} onChange={handleChange} className="w-full bg-white border border-outline-variant rounded px-4 py-3 text-sm outline-none focus:border-primary-container transition-all" placeholder="Vencimiento (MM / AA)" maxLength={5} required type="text" />
                            <input name="cardCvc" value={form.cardCvc as string} onChange={handleChange} className="w-full bg-white border border-outline-variant rounded px-4 py-3 text-sm outline-none focus:border-primary-container transition-all" placeholder="Código de seguridad" maxLength={4} required type="password" />
                          </div>
                        </div>
                      )}

                      {paymentMethod === method.id && method.id === "transfer" && (
                        <div className="px-5 pb-5 pt-4 bg-surface-container-low/20 border-t border-outline-variant/30 space-y-3">
                          {method.instructions && (
                            <p className="text-xs text-outline leading-relaxed italic">{method.instructions}</p>
                          )}
                          {method.accountDetails && (
                            <div className="bg-white border border-outline-variant/30 rounded-lg p-3 space-y-1.5">
                              {[
                                ["Banco", method.accountDetails.bank],
                                ["N° de Cuenta", method.accountDetails.accountNumber],
                                ["Tipo", method.accountDetails.accountType],
                                ["Titular", method.accountDetails.holderName],
                                ["RUC / CI", method.accountDetails.ruc],
                                ["Comprobante a", method.accountDetails.email],
                              ].filter(([, v]) => v).map(([label, val]) => (
                                <div key={label} className="flex gap-3 text-xs">
                                  <span className="text-outline min-w-[110px]">{label}:</span>
                                  <span className="font-semibold text-primary">{val}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {paymentMethod === method.id && method.id === "paypal" && (
                        <div className="px-5 pb-4 pt-3 text-xs text-outline italic border-t border-outline-variant/30">
                          {method.instructions || "Serás redirigido a PayPal para completar el pago."}
                        </div>
                      )}
                    </div>
                  ))}
                  {paymentMethods.length === 0 && (
                    <div className="p-4 text-sm text-outline text-center">Cargando métodos de pago...</div>
                  )}
                </div>
              </section>

              <button
                type="submit"
                className="w-full py-5 bg-primary-container text-on-primary font-bold text-sm tracking-[0.15em] uppercase rounded-md shadow-lg hover:bg-primary transition-all active:scale-[0.98]"
              >
                Pagar Ahora
              </button>

              <footer className="pt-8 border-t border-outline-variant/20 flex flex-wrap gap-x-6 gap-y-2 text-[10px] text-outline uppercase tracking-widest">
                {[
                  "Política de Devoluciones",
                  "Política de Envíos",
                  "Política de Privacidad",
                  "Términos de Servicio",
                ].map((label) => (
                  <a key={label} className="hover:text-primary underline underline-offset-4" href="#">
                    {label}
                  </a>
                ))}
              </footer>
            </form>
          </div>

          {/* ── Columna derecha: Resumen del pedido (sticky) ── */}
          <div className="lg:col-span-5">
            <div className="sticky top-24 space-y-8 p-8 lg:p-10 bg-surface-container-low rounded-xl border border-outline-variant/10">
              <h3 className="font-headline text-xl">Resumen del Pedido</h3>

              {/* Productos */}
              <div className="space-y-6 max-h-[40vh] overflow-y-auto pr-2">
                {cart.map((item) => (
                  <div key={item.id} className="flex gap-4 items-center">
                    <div className="relative w-16 h-20 bg-white border border-outline-variant/30 rounded flex-shrink-0 overflow-hidden">
                      <Image
                        alt={item.name}
                        src={item.image}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                      <span className="absolute -top-2 -right-2 w-5 h-5 bg-outline text-white text-[10px] flex items-center justify-center rounded-full">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-primary truncate">{item.name}</h4>
                      <p className="text-xs text-outline capitalize">
                        {item.category.replace(/-/g, " ")}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-primary">
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Código de descuento */}
              <div className="flex gap-3 py-6 border-y border-outline-variant/20">
                <input
                  className="flex-1 bg-white border border-outline-variant/50 rounded px-4 py-3 text-sm focus:ring-1 focus:ring-primary-container outline-none transition-all"
                  placeholder="Código de descuento"
                  type="text"
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value)}
                />
                <button
                  type="button"
                  className="px-6 py-3 bg-surface-container text-outline font-bold text-xs uppercase tracking-widest rounded-md hover:bg-outline-variant/30 transition-colors"
                >
                  Aplicar
                </button>
              </div>

              {/* Totales */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-outline">Subtotal</span>
                  <span className="font-medium">${cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-outline">Envío</span>
                  <span className="font-medium">${shippingCost.toFixed(2)}</span>
                </div>
                {tax > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-outline">Impuestos (IVA)</span>
                    <span className="font-medium">${tax.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-4 mt-2 border-t border-outline-variant/20">
                  <div>
                    <span className="text-lg font-bold block">Total</span>
                    {tax > 0 && (
                      <span className="text-[10px] text-outline uppercase tracking-widest">
                        IVA incluido: ${tax.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-outline font-medium mr-1">USD</span>
                    <span className="text-2xl font-bold text-primary">${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-[10px] text-outline/60 uppercase tracking-[0.2em] pt-2">
                <span className="material-symbols-outlined text-sm">shield</span>
                Pasarela de Pago Segura
              </div>
            </div>
          </div>

        </div>
      </main>

      <footer className="bg-primary py-10 px-6 mt-16 text-white/40">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-[10px] uppercase tracking-[0.3em]">
            © 2024 The Editorial Alchemist
          </p>
        </div>
      </footer>
    </div>
  );
}
