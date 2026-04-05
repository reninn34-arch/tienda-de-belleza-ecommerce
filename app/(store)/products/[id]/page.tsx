import { getProductById, getAllProducts } from "@/lib/data";
import { notFound } from "next/navigation";
import ProductDetailClient from "./ProductDetailClient";

export async function generateStaticParams() {
  return (await getAllProducts()).map((p) => ({ id: p.id }));
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) notFound();

  const related = (await getAllProducts())
    .filter((p) => p.id !== id)
    .slice(0, 2);

  return <ProductDetailClient product={product} relatedProducts={related} />;
}
