"use client";

import { useState, useEffect } from "react";

export interface AdminProfile {
  name: string;
  email: string;
  password: string;
}

const DEFAULT_PROFILE: AdminProfile = {
  name: "Administrador",
  email: "admin@blush.com",
  password: "blush2024",
};

export function getAdminProfile(): AdminProfile {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const stored = localStorage.getItem("adminProfile");
    return stored ? { ...DEFAULT_PROFILE, ...JSON.parse(stored) } : DEFAULT_PROFILE;
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveAdminProfile(profile: AdminProfile) {
  localStorage.setItem("adminProfile", JSON.stringify(profile));
}

interface Props {
  onClose: () => void;
}

export default function ProfileModal({ onClose }: Props) {
  const [profile, setProfile] = useState<AdminProfile>(DEFAULT_PROFILE);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [infoSaved, setInfoSaved] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [pwdSaved, setPwdSaved] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const p = getAdminProfile();
    setProfile(p);
    setName(p.name);
    setEmail(p.email);
  }, []);

  function saveInfo(e: React.FormEvent) {
    e.preventDefault();
    const updated = { ...profile, name: name.trim(), email: email.trim() };
    saveAdminProfile(updated);
    setProfile(updated);
    setInfoSaved(true);
    setTimeout(() => setInfoSaved(false), 2500);
  }

  function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdError("");
    if (currentPwd !== profile.password) {
      setPwdError("La contraseña actual es incorrecta.");
      return;
    }
    if (newPwd.length < 6) {
      setPwdError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdError("Las contraseñas no coinciden.");
      return;
    }
    const updated = { ...profile, password: newPwd };
    saveAdminProfile(updated);
    setProfile(updated);
    setCurrentPwd("");
    setNewPwd("");
    setConfirmPwd("");
    setPwdSaved(true);
    setTimeout(() => setPwdSaved(false), 2500);
  }

  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "A";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        style={{ fontFamily: "Manrope, sans-serif" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="relative px-6 pt-8 pb-10 text-white text-center"
          style={{ background: "linear-gradient(135deg, #1f1030 0%, #33172c 100%)" }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>

          <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center mx-auto mb-3 text-xl font-bold tracking-wide">
            {initials}
          </div>
          <h2 className="text-lg font-bold">{profile.name}</h2>
          <p className="text-xs text-white/60 mt-0.5">{profile.email}</p>
          <span className="inline-block mt-2 px-3 py-0.5 rounded-full bg-white/10 text-[9px] uppercase tracking-[0.15em] font-bold">
            Administrador
          </span>
        </div>

        <div className="divide-y divide-gray-100 max-h-[62vh] overflow-y-auto">
          {/* ── Información del perfil ── */}
          <form onSubmit={saveInfo} className="px-6 py-5 space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Información del Perfil
            </h3>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1.5">
                Nombre
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#33172c] focus:ring-2 focus:ring-[#33172c]/10 transition-all"
                placeholder="Nombre del administrador"
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#33172c] focus:ring-2 focus:ring-[#33172c]/10 transition-all"
                placeholder="admin@tienda.com"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
              style={{ background: infoSaved ? "#16a34a" : "#1f1030", color: "white" }}
            >
              {infoSaved ? (
                <>
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  Guardado
                </>
              ) : (
                "Guardar Cambios"
              )}
            </button>
          </form>

          {/* ── Cambiar contraseña ── */}
          <form onSubmit={changePassword} className="px-6 py-5 space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Cambiar Contraseña
            </h3>

            {/* Current password */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1.5">
                Contraseña actual
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPwd}
                  onChange={(e) => { setCurrentPwd(e.target.value); setPwdError(""); }}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm outline-none focus:border-[#33172c] focus:ring-2 focus:ring-[#33172c]/10 transition-all"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showCurrent ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            {/* New password */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1.5">
                Nueva contraseña
              </label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPwd}
                  onChange={(e) => { setNewPwd(e.target.value); setPwdError(""); }}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm outline-none focus:border-[#33172c] focus:ring-2 focus:ring-[#33172c]/10 transition-all"
                  placeholder="Mínimo 6 caracteres"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showNew ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1.5">
                Confirmar nueva contraseña
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPwd}
                  onChange={(e) => { setConfirmPwd(e.target.value); setPwdError(""); }}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm outline-none focus:border-[#33172c] focus:ring-2 focus:ring-[#33172c]/10 transition-all"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showConfirm ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            {pwdError && (
              <p className="text-red-500 text-xs flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">error</span>
                {pwdError}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
              style={{ background: pwdSaved ? "#16a34a" : "#33172c", color: "white" }}
            >
              {pwdSaved ? (
                <>
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  Contraseña actualizada
                </>
              ) : (
                "Actualizar Contraseña"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
