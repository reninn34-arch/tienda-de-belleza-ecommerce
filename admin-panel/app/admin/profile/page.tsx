"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAdminProfile, saveAdminProfile, type AdminProfile } from "@/components/ProfileModal";

function PasswordInput({
  value,
  onChange,
  show,
  onToggle,
  placeholder,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-4 py-2.5 pr-11 text-sm outline-none focus:border-[#33172c] focus:ring-2 focus:ring-[#33172c]/10 transition-all bg-white"
        placeholder={placeholder ?? "••••••••"}
        required={required}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
      >
        <span className="material-symbols-outlined text-[18px]">
          {show ? "visibility_off" : "visibility"}
        </span>
      </button>
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<AdminProfile | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [infoSaved, setInfoSaved] = useState(false);

  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [pwdSaved, setPwdSaved] = useState(false);

  useEffect(() => {
    const p = getAdminProfile();
    setProfile(p);
    setName(p.name);
    setEmail(p.email);
  }, []);

  function saveInfo(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    const updated = { ...profile, name: name.trim(), email: email.trim() };
    saveAdminProfile(updated);
    setProfile(updated);
    setInfoSaved(true);
    setTimeout(() => setInfoSaved(false), 2500);
  }

  function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setPwdError("");
    if (currentPwd !== profile.password) { setPwdError("La contraseña actual es incorrecta."); return; }
    if (newPwd.length < 6) { setPwdError("La nueva contraseña debe tener al menos 6 caracteres."); return; }
    if (newPwd !== confirmPwd) { setPwdError("Las contraseñas no coinciden."); return; }
    const updated = { ...profile, password: newPwd };
    saveAdminProfile(updated);
    setProfile(updated);
    setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    setPwdSaved(true);
    setTimeout(() => setPwdSaved(false), 2500);
  }

  if (!profile) return null;

  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "A";

  return (
    <div className="min-h-screen bg-[#f6f7f9] flex flex-col" style={{ fontFamily: "Manrope, sans-serif" }}>

      {/* ── Hero banner ── */}
      <div className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1f1030 0%, #33172c 100%)" }}>
        {/* decorative circles */}
        <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-white/5" />
        <div className="absolute top-8 right-32 w-40 h-40 rounded-full bg-white/5" />

        <div className="relative px-10 py-10 flex items-center gap-8">
          {/* avatar */}
          <div className="w-24 h-24 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center text-3xl font-bold text-white flex-shrink-0">
            {initials}
          </div>

          {/* info */}
          <div className="flex-1">
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">Panel de Administración</span>
            <h1 className="text-3xl font-bold text-white mt-1">{profile.name}</h1>
            <p className="text-sm text-white/60 mt-0.5">{profile.email}</p>
            <div className="flex items-center gap-3 mt-3">
              <span className="px-3 py-1 rounded-full bg-white/10 text-[9px] uppercase tracking-[0.15em] font-bold text-white">
                Administrador
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-green-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                Sesión activa
              </span>
            </div>
          </div>

          {/* logout */}
          <button
            onClick={() => { localStorage.removeItem("adminAuth"); router.replace("/admin/login"); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold text-white/70 border border-white/20 hover:bg-white/10 hover:text-white transition-all flex-shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* ── Two-column body ── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">

        {/* ── LEFT: Información del perfil ── */}
        <div className="p-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#1f1030,#33172c)" }}>
              <span className="material-symbols-outlined text-[18px] text-white">person</span>
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-800">Información del Perfil</h2>
              <p className="text-[11px] text-gray-400">Nombre y correo que aparecen en el panel</p>
            </div>
          </div>

          <form onSubmit={saveInfo} className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                Nombre completo
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#33172c] focus:ring-2 focus:ring-[#33172c]/10 transition-all bg-white"
                placeholder="Nombre del administrador"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#33172c] focus:ring-2 focus:ring-[#33172c]/10 transition-all bg-white"
                placeholder="admin@tienda.com"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                Rol
              </label>
              <div className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-400 bg-gray-50 select-none">
                Administrador
              </div>
            </div>

            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold text-white transition-all"
              style={{ background: infoSaved ? "#16a34a" : "#1f1030" }}
            >
              {infoSaved ? (
                <><span className="material-symbols-outlined text-[18px]">check_circle</span>Guardado</>
              ) : (
                <><span className="material-symbols-outlined text-[18px]">save</span>Guardar Cambios</>
              )}
            </button>
          </form>
        </div>

        {/* ── RIGHT: Seguridad ── */}
        <div className="p-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#1f1030,#33172c)" }}>
              <span className="material-symbols-outlined text-[18px] text-white">lock</span>
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-800">Seguridad</h2>
              <p className="text-[11px] text-gray-400">Actualiza tu contraseña de acceso al panel</p>
            </div>
          </div>

          <form onSubmit={changePassword} className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                Contraseña actual
              </label>
              <PasswordInput
                value={currentPwd}
                onChange={(v) => { setCurrentPwd(v); setPwdError(""); }}
                show={showCurrent}
                onToggle={() => setShowCurrent((x) => !x)}
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                Nueva contraseña
              </label>
              <PasswordInput
                value={newPwd}
                onChange={(v) => { setNewPwd(v); setPwdError(""); }}
                show={showNew}
                onToggle={() => setShowNew((x) => !x)}
                placeholder="Mínimo 6 caracteres"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                Confirmar nueva contraseña
              </label>
              <PasswordInput
                value={confirmPwd}
                onChange={(v) => { setConfirmPwd(v); setPwdError(""); }}
                show={showConfirm}
                onToggle={() => setShowConfirm((x) => !x)}
                required
              />
            </div>

            {pwdError && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-4 py-3">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {pwdError}
              </div>
            )}

            {pwdSaved && (
              <div className="flex items-center gap-2 text-green-700 text-sm bg-green-50 border border-green-100 rounded-lg px-4 py-3">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                Contraseña actualizada correctamente
              </div>
            )}

            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold text-white transition-all"
              style={{ background: "#33172c" }}
            >
              <span className="material-symbols-outlined text-[18px]">lock_reset</span>
              Actualizar Contraseña
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
