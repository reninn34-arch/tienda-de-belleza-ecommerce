import type { Metadata } from "next";
import { getBestSellers } from "@/lib/data";
import CuratedProductsPage from "@/components/store/CuratedProductsPage";

export async function generateMetadata(): Promise<Metadata> {
  const { page } = await getBestSellers();
  return { title: page?.hero?.title ?? "Más Vendidos" };
}

export default async function MasVendidosPage() {
  const { page, products } = await getBestSellers();
  return (
    <CuratedProductsPage
      label={page?.hero?.label ?? "Los Más Pedidos"}
      title={page?.hero?.title ?? "Más Vendidos"}
      subtitle={page?.hero?.subtitle ?? "Los favoritos de nuestra comunidad"}
      products={products}
    />
  );
}
