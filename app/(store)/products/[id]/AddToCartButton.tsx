"use client";

import { useCart } from "@/context/CartContext";
import { Product } from "@/lib/types";
import { useState } from "react";

export default function AddToCartButton({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);

  const isOutOfStock = product.stock !== undefined && Number(product.stock) <= 0;
  const maxStock = product.stock !== undefined ? Number(product.stock) : Infinity;

  const handleAdd = () => {
    if (isOutOfStock) return;
    addToCart(product, quantity);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-4">
        <div className="flex border border-primary/20 bg-transparent items-center">
          <button
            className="w-12 h-12 flex items-center justify-center text-primary hover:bg-surface-variant transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={isOutOfStock}
          >
            <span className="material-symbols-outlined text-sm">remove</span>
          </button>
          <span className="w-8 text-center text-sm font-bold text-primary">{quantity}</span>
          <button
            className="w-12 h-12 flex items-center justify-center text-primary hover:bg-surface-variant transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setQuantity(Math.min(maxStock, Math.max(1, quantity + 1)))}
            disabled={isOutOfStock || quantity >= maxStock}
          >
            <span className="material-symbols-outlined text-sm">add</span>
          </button>
        </div>
        <button
          onClick={handleAdd}
          disabled={isOutOfStock}
          className={`flex-1 flex justify-center items-center gap-3 py-4 text-[11px] font-bold uppercase tracking-[0.2em] transition-all editorial-shadow ${
            isOutOfStock
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : isAdded
                ? 'bg-secondary text-white'
                : 'bg-primary text-white hover:bg-primary/90'
          }`}
        >
          {isOutOfStock ? (
            'Agotado'
          ) : isAdded ? (
            <>
              <span className="material-symbols-outlined text-[16px]">check</span>
              Agregado al Tocador
            </>
          ) : (
            `Agregar al Tocador — $${(product.price * quantity).toFixed(2)}`
          )}
        </button>
      </div>
      {isOutOfStock && (
        <p className="text-red-500 text-[10px] font-bold uppercase tracking-widest text-center">
          Este producto se encuentra agotado por el momento.
        </p>
      )}
    </div>
  );
}