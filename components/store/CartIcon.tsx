"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useEffect, useState } from "react";

export default function CartIcon() {
  const { cartCount } = useCart();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Link href="/cart" className="relative material-symbols-outlined hover:opacity-70 transition-opacity">
      shopping_bag
      {mounted && cartCount > 0 && (
        <span className="absolute -top-1 -right-2 bg-secondary text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-label">
          {cartCount}
        </span>
      )}
    </Link>
  );
}
