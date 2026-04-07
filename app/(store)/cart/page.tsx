"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useEffect, useState } from "react";

export default function CartPage() {
  const { cart, removeFromCart, updateQuantity, cartTotal } = useCart();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="pt-32 pb-24 min-h-screen bg-background">
      <div className="max-w-[1000px] mx-auto px-8 lg:px-0">
        <div className="mb-12">
          <span className="text-[10px] font-label uppercase tracking-[0.3em] text-secondary font-bold">Tu Selección</span>
          <h1 className="text-3xl md:text-5xl font-headline text-primary mt-2">El Tocador</h1>
        </div>

        {cart.length === 0 ? (
          <div className="text-center py-32 bg-surface-container-low border border-surface-variant/30">
            <h2 className="text-2xl font-headline text-primary mb-4">Tu tocador está vacío</h2>
            <p className="text-on-surface-variant text-sm mb-8">Comienza tu transformación alquímica eligiendo un tono.</p>
            <Link 
              href="/products" 
              className="inline-block bg-primary text-white px-8 py-4 text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-secondary transition-colors"
            >
              Explorar Archivo
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
            <div className="lg:col-span-2 space-y-8">
              {/* Desktop Header */}
              <div className="hidden md:grid grid-cols-6 gap-4 border-b border-surface-variant/30 pb-4">
                <div className="col-span-3 text-[10px] uppercase tracking-[0.15em] font-bold text-on-surface/50">Producto</div>
                <div className="col-span-2 text-[10px] uppercase tracking-[0.15em] font-bold text-on-surface/50 text-center">Cantidad</div>
                <div className="col-span-1 text-[10px] uppercase tracking-[0.15em] font-bold text-on-surface/50 text-right">Total</div>
              </div>

              {/* Cart Items */}
              {cart.map((item) => (
                <div key={item.id} className="grid grid-cols-1 md:grid-cols-6 gap-6 items-center border-b border-surface-variant/30 pb-8">
                  <div className="col-span-3 flex gap-6 items-center">
                    <div className="w-24 h-32 bg-surface-container shrink-0">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-[0.2em] text-on-surface/40 font-bold block mb-1">{item.category}</span>
                      <Link href={`/products/${item.id}`} className="text-lg font-headline text-primary hover:text-secondary transition-colors block mb-2">
                        {item.name}
                      </Link>
                      <button 
                        onClick={() => removeFromCart(item.id)}
                        className="text-[10px] uppercase tracking-widest text-secondary font-bold hover:underline"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                  <div className="col-span-2 flex justify-start md:justify-center">
                    <div className="flex border border-primary/20 bg-transparent items-center">
                      <button 
                        className="w-10 h-10 flex items-center justify-center text-primary hover:bg-surface-variant transition-colors"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      >
                        <span className="material-symbols-outlined text-sm">remove</span>
                      </button>
                      <span className="w-8 text-center text-sm font-bold text-primary">{item.quantity}</span>
                      <button 
                        className={`w-10 h-10 flex items-center justify-center transition-colors ${item.stock !== undefined && item.quantity >= Number(item.stock) ? "text-gray-300 cursor-not-allowed" : "text-primary hover:bg-surface-variant"}`}
                        disabled={item.stock !== undefined && item.quantity >= Number(item.stock)}
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        <span className="material-symbols-outlined text-sm">add</span>
                      </button>
                    </div>
                  </div>
                  <div className="col-span-1 text-left md:text-right">
                    <span className="text-lg font-headline text-primary block">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-surface-container-low p-8 border border-surface-variant/30 sticky top-32">
                <h3 className="text-xl font-headline text-primary mb-6">Resumen del Pedido</h3>
                <div className="space-y-4 mb-8">
                  <div className="flex justify-between text-sm text-on-surface-variant">
                    <span>Subtotal</span>
                    <span>${cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-on-surface-variant">
                    <span>Envío</span>
                    <span>Calculado al finalizar</span>
                  </div>
                </div>
                <div className="flex justify-between text-lg font-headline text-primary border-t border-surface-variant/30 pt-6 mb-8">
                  <span>Total</span>
                  <span>${cartTotal.toFixed(2)}</span>
                </div>
                <Link
                  href="/checkout"
                  className="w-full block text-center bg-primary text-white py-5 text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-secondary transition-all shadow-lg active:scale-95 editorial-shadow mb-4"
                >
                  Proceder al Pago
                </Link>
                <p className="text-center text-[10px] text-on-surface/50 uppercase tracking-widest">
                  Pago Seguro Cifrado
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
