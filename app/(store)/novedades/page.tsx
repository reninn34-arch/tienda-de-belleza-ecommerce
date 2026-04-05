import type { Metadata } from "next";
import { getNovedades } from "@/lib/data";
import CuratedProductsPage from "@/components/store/CuratedProductsPage";

export async function generateMetadata(): Promise<Metadata> {
  const { page } = await getNovedades();
  return { title: page?.hero?.title ?? "Novedades" };
}

export default async function NovedadesPage() {
  const { page, products } = await getNovedades();
  return (
    <CuratedProductsPage
      label={page?.hero?.label ?? "Nuevas Llegadas"}
      title={page?.hero?.title ?? "Novedades"}
      subtitle={page?.hero?.subtitle ?? "Los últimos lanzamientos de la casa"}
      products={products}
    />
  );
}
