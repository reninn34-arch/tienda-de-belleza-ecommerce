import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProductById, getCollectionById, getAllProducts } from "@/lib/data";
import ProductDetailClient from "@/app/(store)/products/[id]/ProductDetailClient";

interface Props {
  params: Promise<{ id: string; productId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { productId } = await params;
  const product = await getProductById(productId);
  return { title: product?.name ?? "Producto" };
}

export async function generateStaticParams() {
  // Pre-render all collection + product combos at build time
  return [];
}

export default async function CollectionProductPage({ params }: Props) {
  const { id, productId } = await params;

  const [product, { collection }, allProducts] = await Promise.all([
    getProductById(productId),
    getCollectionById(id),
    getAllProducts(),
  ]);

  if (!product || !collection) notFound();

  // Related = other products in the same collection (excluding current)
  const collectionProducts = allProducts.filter(
    (p) => collection.productIds?.includes(p.id) && p.id !== productId
  );
  const related = collectionProducts.slice(0, 2);

  return (
    <ProductDetailClient
      product={product}
      relatedProducts={related}
      breadcrumb={{
        collectionId: id,
        collectionTitle: collection.title,
      }}
    />
  );
}
