"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export interface Notif {
  id: string;
  type: "order" | "stock" | "outofstock";
  title: string;
  body: string;
  href: string;
  time: string;
  read: boolean;
}

interface Props {
  open: boolean;
  notifications: Notif[];
  onClose: () => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

const TYPE_ICON: Record<Notif["type"], string> = {
  order: "receipt_long",
  stock: "warning",
  outofstock: "inventory",
};

const TYPE_COLOR: Record<Notif["type"], string> = {
  order: "bg-[#33172c]/10 text-[#33172c]",
  stock: "bg-amber-100 text-amber-600",
  outofstock: "bg-red-100 text-red-500",
};

export default function NotificationsPanel({ open, notifications, onClose, onMarkRead, onMarkAllRead }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [alertsEnabled, setAlertsEnabled] = useState(false);

  // Revisar permisos y leer de localStorage si están encendidas
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
      
      const stored = localStorage.getItem("blush_alerts_enabled");
      if (stored !== null) {
        setAlertsEnabled(stored === "true");
      } else if (Notification.permission === "granted") {
        setAlertsEnabled(true);
      }
    } else {
      setPermission("unsupported");
    }
  }, [open]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  // Función para encender/apagar el switch
  const toggleAlerts = async () => {
    const newVal = !alertsEnabled;
    
    if (newVal && permission !== "granted") {
      const p = await Notification.requestPermission();
      setPermission(p);
      if (p !== "granted") return; // Si deniega, no encendemos el switch
    }

    setAlertsEnabled(newVal);
    localStorage.setItem("blush_alerts_enabled", String(newVal));
  };

  // Función para forzar una notificación de prueba
  const testNotification = () => {
    if (permission === "granted") {
      new Notification("Prueba Exitosa 💸", {
        body: "¡Acabas de recibir un pedido! Las notificaciones funcionan.",
        icon: "/icon-192.png" 
      });
    } else {
      alert("Primero debes otorgar permisos en tu navegador.");
    }
  };

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <>
      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 z-[60] bg-black/20" onClick={onClose} />
      )}

      {/* Panel */}
      <div
        ref={panelRef}
        className={`fixed top-0 right-0 h-full w-80 max-w-[90vw] z-[70] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-[#33172c]">notifications</span>
            <p className="font-bold text-sm text-gray-800">Notificaciones</p>
            {unread > 0 && (
              <span className="bg-[#33172c] text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unread > 0 && (
              <button
                onClick={onMarkAllRead}
                className="text-[11px] text-[#33172c] hover:underline font-semibold"
              >
                Marcar todas
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* CONTROLES DE NOTIFICACIONES */}
        {permission !== "unsupported" && (
          <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-100">
            <div className="flex flex-col">
              <span className="text-[12px] font-bold text-gray-800">Alertas de Escritorio</span>
              <span className="text-[10px] text-gray-500">
                {permission === "granted" ? "Permiso concedido" : "Requiere permiso"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {permission === "granted" && alertsEnabled && (
                <button 
                  onClick={testNotification}
                  className="text-[10px] text-indigo-600 font-bold hover:underline"
                >
                  Probar
                </button>
              )}
              {/* Toggle Switch Estilo iPhone */}
              <button
                onClick={toggleAlerts}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  alertsEnabled ? "bg-[#33172c]" : "bg-gray-300"
                }`}
              >
                <span 
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    alertsEnabled ? "translate-x-5" : "translate-x-1"
                  }`} 
                />
              </button>
            </div>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
              <span className="material-symbols-outlined text-5xl">notifications_none</span>
              <p className="text-sm">Sin notificaciones</p>
            </div>
          ) : (
            notifications.map((n) => (
              <Link
                key={n.id}
                href={n.href}
                onClick={() => { onMarkRead(n.id); onClose(); }}
                className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${!n.read ? "bg-[#33172c]/[0.03]" : ""}`}
              >
                {/* Icon */}
                <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center mt-0.5 ${TYPE_COLOR[n.type]}`}>
                  <span className="material-symbols-outlined text-[18px]">{TYPE_ICON[n.type]}</span>
                </div>
                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] leading-snug ${!n.read ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}>
                    {n.title}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{n.body}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{n.time}</p>
                </div>
                {/* Unread dot */}
                {!n.read && (
                  <div className="flex-shrink-0 w-2 h-2 rounded-full bg-[#33172c] mt-2" />
                )}
              </Link>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-4 py-3">
          <Link
            href="/admin/orders"
            onClick={onClose}
            className="flex items-center justify-center gap-1.5 text-[12px] font-semibold text-[#33172c] hover:underline"
          >
            Ver todos los pedidos
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </Link>
        </div>
      </div>
    </>
  );
}