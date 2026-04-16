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
  isLoaded: boolean;
  validateCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize from local storage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem("blush_cart");
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart) as CartItem[]);
      } catch (e) {
        console.error("Failed to parse cart", e);
      }
    }
    setIsLoaded(true);
    // Background auto-validate on mount
    validateCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save to local storage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("blush_cart", JSON.stringify(cart));
    }
  }, [cart, isLoaded]);

  const addToCart = (product: Product, quantity = 1) => {
    setCart((prev) => {
      const stock = product.totalStock;
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
        const stock = item.totalStock;
        const cappedQty = stock !== undefined ? Math.min(quantity, Number(stock)) : quantity;
        return { ...item, quantity: cappedQty };
      })
    );
  };

  const validateCart = async () => {
    try {
      const res = await fetch("/api/products");
      if (!res.ok) return;
      const products: Product[] = await res.json();
      
      setCart((prev) => {
        if (prev.length === 0) return prev;
        let changed = false;
        const newCart = prev.map(item => {
          const freshProduct = products.find(p => p.id === item.id);
          if (!freshProduct) {
            changed = true;
            return null;
          }
          const stock = freshProduct.totalStock;
          const cappedQty = stock !== undefined ? Math.min(item.quantity, Number(stock)) : item.quantity;
          if (cappedQty !== item.quantity || freshProduct.price !== item.price || freshProduct.name !== item.name) {
            changed = true;
          }
          if (cappedQty <= 0) {
             changed = true;
             return null;
          }
          return { ...item, quantity: cappedQty, totalStock: stock, price: freshProduct.price, name: freshProduct.name };
        }).filter(Boolean) as CartItem[];
        return changed ? newCart : prev;
      });
    } catch (e) {
      console.error("Cart validation failed", e);
    }
  };

  const clearCart = () => setCart([]);

  const cartTotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
  const cartCount = cart.reduce((count, item) => count + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal, cartCount, isLoaded, validateCart }}
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
