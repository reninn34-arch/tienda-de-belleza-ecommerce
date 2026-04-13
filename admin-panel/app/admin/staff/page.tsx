"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAdminProfile } from "@/components/ProfileModal";

interface Branch { id: string; name: string; }
interface Staff {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "VENDEDOR";
  branchId: string | null;
  branch?: { name: string };
  createdAt: string;
}

export default function StaffPage() {
  const router = useRouter();
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "VENDEDOR">("VENDEDOR");
  const [branchId, setBranchId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const refreshList = async () => {
    try {
      const s = await fetch("/api/admin/staff").then(r => r.json());
      setStaffList(s);
    } catch (err) {
      console.error("Error refreshing staff list", err);
    }
  };

  useEffect(() => {
    const profile = getAdminProfile();
    if (profile.role !== "ADMIN") {
      router.replace("/admin");
      return;
    }

    Promise.all([
      fetch("/api/admin/staff").then(r => r.json()),
      fetch("/api/admin/branches").then(r => r.json())
    ]).then(([s, b]) => {
      setStaffList(s);
      setBranches(b);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    
    try {
      const url = editingId ? `/api/admin/staff/${editingId}` : "/api/admin/staff";
      const method = editingId ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name, 
          email, 
          password: password.trim() || undefined, 
          role, 
          branchId: role === "VENDEDOR" ? branchId : null 
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || `Error al ${editingId ? "actualizar" : "crear"} usuario`);
      
      await refreshList();
      closeForm();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setName("");
    setEmail("");
    setPassword("");
    setRole("VENDEDOR");
    setBranchId("");
    setError("");
  };

  const handleEdit = (s: Staff) => {
    setEditingId(s.id);
    setName(s.name);
    setEmail(s.email);
    setPassword(""); // Keep password empty unless changing
    setRole(s.role);
    setBranchId(s.branchId || "");
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const profile = getAdminProfile();
    // Prevent self-deletion check handled by backend but good to have UI hint
    if (!window.confirm("¿Estás seguro de eliminar este usuario?")) return;
    
    try {
      const res = await fetch(`/api/admin/staff/${id}`, { method: "DELETE" });
      if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error?.message || "Error al eliminar");
      }
      setStaffList(prev => prev.filter(s => s.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><div className="w-8 h-8 border-2 border-[#33172c] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Equipo</h1>
          <p className="text-sm text-gray-500 mt-1">Administra roles y sucursales de tus colaboradores</p>
        </div>
        <button 
          onClick={() => { closeForm(); setShowForm(true); }}
          className="bg-[#33172c] text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#4b2c42] transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          Nuevo Miembro
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Usuario</th>
              <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Rol</th>
              <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Sucursal</th>
              <th className="text-right px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {staffList.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50/30 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-bold text-gray-900">{s.name}</p>
                  <p className="text-xs text-gray-400">{s.email}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${s.role === "ADMIN" ? "bg-indigo-50 text-indigo-700" : "bg-emerald-50 text-emerald-700"}`}>
                    {s.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <p className="text-xs font-medium text-gray-600">
                    {s.role === "ADMIN" ? "Acceso Total" : (s.branch?.name || "No asignada")}
                  </p>
                </td>
                <td className="px-6 py-4 text-right">
                   <div className="flex items-center justify-end gap-1">
                     <button 
                      onClick={() => handleEdit(s)}
                      className="p-2 text-gray-400 hover:text-[#33172c] hover:bg-gray-100 rounded-lg transition-all"
                      title="Editar"
                     >
                       <span className="material-symbols-outlined text-[20px]">edit</span>
                     </button>
                     <button 
                      onClick={() => handleDelete(s.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      title="Eliminar"
                     >
                       <span className="material-symbols-outlined text-[20px]">delete</span>
                     </button>
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL FORM */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-sm font-bold text-gray-800">{editingId ? "Editar Miembro" : "Registrar Nuevo Miembro"}</h2>
              <button onClick={closeForm} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Nombre Completo</label>
                <input required value={name} onChange={e => setName(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#33172c] transition-all" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Email</label>
                <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#33172c] transition-all" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">
                  Contraseña {editingId && "(dejar en blanco para mantener actual)"}
                </label>
                <input required={!editingId} type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#33172c] transition-all" placeholder={editingId ? "••••••••" : ""} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Rol</label>
                  <select value={role} onChange={e => setRole(e.target.value as any)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#33172c] transition-all">
                    <option value="VENDEDOR">Vendedor</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>
                {role === "VENDEDOR" && (
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Sucursal</label>
                    <select required value={branchId} onChange={e => setBranchId(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#33172c] transition-all">
                      <option value="">Seleccionar...</option>
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name === "tienda-online" ? "Tienda Online" : b.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {error && <p className="text-red-500 text-xs font-medium">{error}</p>}

              <button 
                type="submit" 
                disabled={saving}
                className="w-full bg-[#33172c] text-white py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#4b2c42] transition-all disabled:opacity-50 mt-4"
              >
                {saving ? "Procesando..." : (editingId ? "Guardar Cambios" : "Crear Usuario")}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
