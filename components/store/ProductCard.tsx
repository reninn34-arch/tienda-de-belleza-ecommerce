"use client";

import Link from "next/link";
import { Product } from "@/lib/types";
import { useCart } from "@/context/CartContext";

export default function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const isOutOfStock = product.stock !== undefined && Number(product.stock) <= 0;

  return (
    <div className="group card-hover flex flex-col bg-white editorial-shadow relative">
      <Link href={`/products/${product.id}`} className="block relative aspect-[3/4] overflow-hidden bg-surface-container">
        <img 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" 
          alt={product.name} 
          src={product.image}
        />
        <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        
        <button 
          onClick={(e) => {
            e.preventDefault();
            if (!isOutOfStock) addToCart(product);
          }}
          disabled={isOutOfStock}
          className={`absolute bottom-6 left-6 right-6 py-4 font-label text-[10px] uppercase tracking-[0.2em] font-bold shadow-xl z-20 opacity-100 translate-y-0 sm:opacity-0 sm:translate-y-4 sm:group-hover:opacity-100 sm:group-hover:translate-y-0 transition-all duration-300 ${isOutOfStock ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-white"}`}
        >
          {isOutOfStock ? "Agotado" : `Agregar — $${product.price}`}
        </button>
        
        {product.badge && (
          <div className="absolute top-4 right-4 z-10">
            <span className={`text-white text-[9px] px-3 py-1 uppercase tracking-widest font-bold rounded-full ${product.badge === 'Top Rated' ? 'bg-secondary' : 'bg-primary'}`}>
              {product.badge === 'Top Rated' ? 'Más Valorado' : product.badge === 'Pro Kit' ? 'Kit Pro' : product.badge}
            </span>
          </div>
        )}
      </Link>
      <div className="space-y-2 text-center">
        <h4 className="font-headline text-xl text-primary">{product.name}</h4>
        <p className="text-on-surface-variant text-[11px] uppercase tracking-widest font-light">
          {({
            "permanent": "Permanente",
            "semi-permanent": "Semipermanente",
            "treatments": "Tratamientos",
            "lightener": "Aclarante",
            "demi-permanent": "Demi-Permanente",
          } as Record<string, string>)[product.category] ?? product.category.replace("-", " ")}
        </p>
      </div>
    </div>
  );
}
