"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminProfile } from "@/components/ProfileModal";

export default function LoginForm({ storeName }: { storeName: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loading, setLoading] = useState(false);

  function clearErrors() {
    setEmailError("");
    setPasswordError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    clearErrors();
    setLoading(true);

    try {
      const res = await fetch("http://localhost:4000/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (data.error?.toLowerCase().includes("email") || data.error?.toLowerCase().includes("correo")) {
          setEmailError("Correo electrónico no reconocido.");
        } else {
          setPasswordError("Contraseña incorrecta.");
        }
        setLoading(false);
        return;
      }

      const data = await res.json();
      localStorage.setItem("adminProfile", JSON.stringify(data.user));
      localStorage.setItem("adminAuth", "true");
      router.replace("/admin");
    } catch (err) {
      console.error(err);
      setPasswordError("Error al conectar con el servidor.");
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "linear-gradient(135deg, #1f1030 0%, #33172c 100%)" }}
    >
      {/* Decorative circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-white/5" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center mx-auto mb-5 backdrop-blur-sm">
            <span className="material-symbols-outlined text-white text-3xl">diamond</span>
          </div>
          <h1
            className="text-2xl font-bold text-white"
            style={{ fontFamily: "Noto Serif, serif", fontStyle: "italic" }}
          >
            {storeName}
          </h1>
          <p className="text-xs text-white/40 mt-2 tracking-[0.2em] uppercase">Panel de Administración</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #1f1030, #bc93ad, #33172c)" }} />

          <div className="p-8">
            <h2 className="text-base font-bold text-gray-800 mb-1">Bienvenido de nuevo</h2>
            <p className="text-xs text-gray-400 mb-6">Ingresa tus credenciales para continuar.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                  Correo electrónico
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-gray-300">
                    mail
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
                    className={`w-full border rounded-xl pl-9 pr-4 py-3 text-sm outline-none transition-all ${
                      emailError
                        ? "border-red-400 focus:ring-2 focus:ring-red-200 bg-red-50"
                        : "border-gray-200 focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c]"
                    }`}
                    placeholder="admin@blush.com"
                    required
                    autoFocus
                    autoComplete="email"
                  />
                </div>
                {emailError && (
                  <p className="text-red-500 text-[11px] mt-1.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">error</span>
                    {emailError}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-gray-300">
                    lock
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setPasswordError(""); }}
                    className={`w-full border rounded-xl pl-9 pr-11 py-3 text-sm outline-none transition-all ${
                      passwordError
                        ? "border-red-400 focus:ring-2 focus:ring-red-200 bg-red-50"
                        : "border-gray-200 focus:ring-2 focus:ring-[#33172c]/20 focus:border-[#33172c]"
                    }`}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                    tabIndex={-1}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
                {passwordError && (
                  <p className="text-red-500 text-[11px] mt-1.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">error</span>
                    {passwordError}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 text-white rounded-xl text-sm font-bold tracking-widest uppercase transition-all disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
                style={{ background: "linear-gradient(135deg, #1f1030, #33172c)" }}
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">login</span>
                    Iniciar Sesión
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-white/20 text-[10px] mt-6 tracking-wider">
          © 2026 {storeName}
        </p>
      </div>
    </div>
  );
}
