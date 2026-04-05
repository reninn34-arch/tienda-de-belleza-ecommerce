"use client";

import { useEffect, useState } from "react";

interface AccountDetails {
  bank: string;
  accountNumber: string;
  accountType: string;
  holderName: string;
  ruc: string;
  email: string;
}

interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
  instructions: string;
  accountDetails?: AccountDetails;
  email?: string;
}

const METHOD_DESCRIPTIONS: Record<string, string> = {
  card: "Los clientes pagan con tarjeta de crédito o débito directamente en la tienda.",
  transfer: "Los clientes realizan una transferencia bancaria al completar el pedido. Se les mostrarán los datos de la cuenta.",
  paypal: "Los clientes son redirigidos a PayPal para completar el pago.",
};

export default function AdminPaymentsPage() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings").then((r) => r.json()).then((s) => setMethods(s.payments.methods));
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  }

  async function saveAll(updated: PaymentMethod[]) {
    setSaving(true);
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payments: { methods: updated } }),
    });
    setSaving(false);
    showToast("Métodos de pago guardados correctamente.");
  }

  function toggle(id: string) {
    const updated = methods.map((m) => m.id === id ? { ...m, enabled: !m.enabled } : m);
    setMethods(updated);
    saveAll(updated);
  }

  function updateMethod(id: string, key: keyof PaymentMethod, value: string) {
    setMethods((prev) => prev.map((m) => m.id === id ? { ...m, [key]: value } : m));
  }

  function updateAccount(id: string, key: keyof AccountDetails, value: string) {
    setMethods((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, accountDetails: { ...m.accountDetails!, [key]: value } }
          : m
      )
    );
  }

  async function handleSave() {
    await saveAll(methods);
  }

  if (methods.length === 0) {
    return <div className="p-8 flex justify-center"><span className="w-7 h-7 border-2 border-[#33172c] border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">check_circle</span>
          {toast}
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Métodos de Pago</h1>
        <p className="text-sm text-gray-400 mt-1">Activa, desactiva y configura los métodos de pago disponibles para tus clientes.</p>
      </div>

      <div className="space-y-4">
        {methods.map((method) => (
          <div
            key={method.id}
            className={`bg-white rounded-2xl border shadow-sm transition-all ${method.enabled ? "border-gray-100" : "border-gray-100 opacity-60"}`}
          >
            {/* Header row */}
            <div className="flex items-center justify-between p-5">
              <div className="flex items-center gap-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${method.enabled ? "bg-violet-50 text-violet-600" : "bg-gray-100 text-gray-400"}`}>
                  <span className="material-symbols-outlined text-[22px]">{method.icon}</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{method.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5 max-w-xs">{METHOD_DESCRIPTIONS[method.id]}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <button
                  onClick={() => setExpanded(expanded === method.id ? null : method.id)}
                  className="text-xs font-semibold text-[#33172c] hover:underline"
                >
                  {expanded === method.id ? "Ocultar" : "Configurar"}
                </button>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={method.enabled} onChange={() => toggle(method.id)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-[#33172c] transition-colors after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
                </label>
              </div>
            </div>

            {/* Expanded config */}
            {expanded === method.id && (
              <div className="border-t border-gray-100 px-5 pb-6 pt-5">
                {method.id === "card" && (
                  <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700 flex items-start gap-3">
                    <span className="material-symbols-outlined text-[20px] flex-shrink-0 mt-0.5">info</span>
                    <p>El procesamiento de tarjetas requiere integración con una pasarela de pago como Stripe o PayU. Actualmente en modo demostración.</p>
                  </div>
                )}

                {method.id === "transfer" && (
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Datos de la Cuenta Bancaria</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { key: "bank" as const, label: "Banco", placeholder: "Banco Pichincha" },
                          { key: "accountNumber" as const, label: "Número de Cuenta", placeholder: "2200000001" },
                          { key: "accountType" as const, label: "Tipo de Cuenta", placeholder: "Cuenta Corriente" },
                          { key: "holderName" as const, label: "Nombre del Titular", placeholder: "The Editorial Alchemist..." },
                          { key: "ruc" as const, label: "RUC / CI", placeholder: "1790000000001" },
                          { key: "email" as const, label: "Correo para comprobantes", placeholder: "pagos@..." },
                        ].map(({ key, label, placeholder }) => (
                          <div key={key} className={key === "holderName" || key === "email" ? "col-span-2" : ""}>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">{label}</label>
                            <input
                              value={method.accountDetails?.[key] ?? ""}
                              onChange={(e) => updateAccount(method.id, key, e.target.value)}
                              placeholder={placeholder}
                              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Instrucciones para el cliente</label>
                      <p className="text-xs text-gray-400 mb-2">Este texto se muestra al cliente después de confirmar su pedido con este método de pago.</p>
                      <textarea
                        value={method.instructions}
                        onChange={(e) => updateMethod(method.id, "instructions", e.target.value)}
                        rows={4}
                        placeholder="Una vez completado el pedido, realiza la transferencia a la cuenta indicada y envíanos el comprobante..."
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none resize-none"
                      />
                    </div>

                    {/* Preview */}
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Vista previa para el cliente</p>
                      <p className="text-xs text-gray-600 italic mb-3">{method.instructions || "Sin instrucciones."}</p>
                      {method.accountDetails && (
                        <div className="bg-white rounded-lg p-3 border border-gray-200 space-y-1.5">
                          {[
                            ["Banco", method.accountDetails.bank],
                            ["N° de Cuenta", method.accountDetails.accountNumber],
                            ["Tipo", method.accountDetails.accountType],
                            ["Titular", method.accountDetails.holderName],
                            ["RUC / CI", method.accountDetails.ruc],
                            ["Comprobantes", method.accountDetails.email],
                          ].map(([label, val]) => val && (
                            <div key={label} className="flex gap-3 text-xs">
                              <span className="text-gray-400 w-24 flex-shrink-0">{label}:</span>
                              <span className="font-semibold text-gray-800">{val}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {method.id === "paypal" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Correo PayPal</label>
                      <input
                        value={method.email ?? ""}
                        onChange={(e) => updateMethod(method.id, "email", e.target.value)}
                        type="email"
                        placeholder="pagos@editorialalchemist.com"
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Instrucciones para el cliente</label>
                      <textarea
                        value={method.instructions}
                        onChange={(e) => updateMethod(method.id, "instructions", e.target.value)}
                        rows={3}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c] outline-none resize-none"
                      />
                    </div>
                  </div>
                )}

                {method.id !== "card" && (
                  <div className="flex justify-end mt-5">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-2 px-6 py-2.5 bg-[#33172c] text-white rounded-xl text-sm font-bold hover:bg-[#4b2c42] transition-colors disabled:opacity-60"
                    >
                      {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                      {saving ? "Guardando..." : "Guardar Configuración"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
