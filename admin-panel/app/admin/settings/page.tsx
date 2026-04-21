"use client";
import Link from "next/link";

const CONFIG_MODULOS = [
  {
    titulo: "General e Identidad",
    desc: "Nombre de la tienda y configuración básica",
    icon: "store",
    href: "/admin/identity",
  },
  {
    titulo: "Gestión de Equipo",
    desc: "Administra permisos y accesos de empleados",
    icon: "badge",
    href: "/admin/staff",
  },
  {
    titulo: "Sucursales",
    desc: "Gestiona tus puntos de venta físicos",
    icon: "storefront",
    href: "/admin/branches",
  },
  {
    titulo: "Políticas",
    desc: "Privacidad, términos de servicio y devoluciones",
    icon: "policy",
    href: "/admin/policies",
  },
  {
    titulo: "Métodos de Envío",
    desc: "Configura transportistas y zonas de entrega",
    icon: "local_shipping",
    href: "/admin/shipping",
  },
  {
    titulo: "Métodos de Pago",
    desc: "Configura transferencias y pasarelas",
    icon: "payments",
    href: "/admin/payments",
  },
];

export default function SettingsHub() {
  return (
    <div
      className="p-8 max-w-5xl mx-auto"
      style={{ fontFamily: "Manrope, sans-serif" }}
    >
      <header className="mb-10">
        <h1 className="text-2xl font-bold text-[#1f1030]">Configuración</h1>
        <p className="text-gray-500 mt-1">
          Administra todos los aspectos operativos de tu tienda
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {CONFIG_MODULOS.map((mod) => (
          <Link
            key={mod.href}
            href={mod.href}
            className="flex flex-col p-6 bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-purple-300 hover:shadow-md transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center mb-4 group-hover:bg-purple-600 transition-colors">
              <span className="material-symbols-outlined text-purple-600 group-hover:text-white">
                {mod.icon}
              </span>
            </div>
            <h3 className="font-bold text-gray-800 mb-1">{mod.titulo}</h3>
            <p className="text-xs text-gray-500 leading-relaxed">{mod.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
