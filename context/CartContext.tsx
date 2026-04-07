"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { CartItem, Product } from "@/lib/types";

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") return [];
    const savedCart = localStorage.getItem("blush_cart");
    if (!savedCart) return [];
    try {
      return JSON.parse(savedCart) as CartItem[];
    } catch (e) {
      console.error("Failed to parse cart", e);
      return [];
    }
  });

  // Save to local storage
  useEffect(() => {
    localStorage.setItem("blush_cart", JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product: Product, quantity = 1) => {
    setCart((prev) => {
      const stock = product.stock;
      // If out of stock, don't add
      if (stock !== undefined && Number(stock) <= 0) return prev;
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        const newQty = existing.quantity + quantity;
        const cappedQty = stock !== undefined ? Math.min(newQty, Number(stock)) : newQty;
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: cappedQty } : item
        );
      }
      const cappedQty = stock !== undefined ? Math.min(quantity, Number(stock)) : quantity;
      return [...prev, { ...product, quantity: cappedQty }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (item.id !== productId) return item;
        const stock = item.stock;
        const cappedQty = stock !== undefined ? Math.min(quantity, Number(stock)) : quantity;
        return { ...item, quantity: cappedQty };
      })
    );
  };

  const clearCart = () => setCart([]);

  const cartTotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
  const cartCount = cart.reduce((count, item) => count + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal, cartCount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
