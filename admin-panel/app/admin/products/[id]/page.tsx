"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import ProductForm from "../ProductForm";

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [product, setProduct] = useState<Record<string, unknown> | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/products/${id}`)
      .then((r) => {
        if (!r.ok) { setNotFound(true); return null; }
        return r.json();
      })
      .then((data) => { if (data) setProduct(data); });
  }, [id]);

  if (notFound) {
    return (
      <div className="p-8 text-center text-gray-400">
        <p>Producto no encontrado.</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-8 flex items-center justify-center">
        <span className="w-7 h-7 border-2 border-[#33172c] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <ProductForm
      mode="edit"
      productId={id}
      initial={{
        id: product.id as string,
        name: product.name as string,
        description: product.description as string,
        price: String(product.price),
        cost: product.cost !== undefined ? String(product.cost) : "",
        sku: (product.sku as string) ?? "",
        inventories: (product.inventories as { branchId: string; stock: number }[]) ?? [],
        category: product.category as string,
        image: product.image as string,
        badge: (product.badge as string) ?? "",
        features: (product.features as string[]) ?? [""],
        gallery: (product.gallery as string[]) ?? [],
        swatches: (product.swatches as { color: string; label: string }[]) ?? [],
        reviews: ((product.reviews as { title: string; text: string; author: string; stars: number }[]) ?? []).map((r) => ({ ...r, stars: String(r.stars) })),
        details: (product.details as string) ?? "",
        howToUse: (product.howToUse as string) ?? "",
        shippingInfo: (product.shippingInfo as string) ?? "",
        highlights: (product.highlights as { icon: string; title: string; desc: string }[]) ?? [],
        highlightsLabel: (product.highlightsLabel as string) ?? "",
        highlightsTitle: (product.highlightsTitle as string) ?? "",
        scienceTitle: (product.scienceTitle as string) ?? "",
        scienceDesc: (product.scienceDesc as string) ?? "",
        scienceItems: (product.scienceItems as { icon: string; title: string; desc: string }[]) ?? [],
        taxRate: (product.taxRate as number) ?? 0,
      }}
    />
  );
}
