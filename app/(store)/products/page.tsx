import { getAllProducts, getCategories } from "@/lib/data";
import ProductsClient from "@/components/store/ProductsClient";

export default async function ProductsPage() {
  const products = await getAllProducts();
  const categories = await getCategories();
  return (
    <div className="pt-20 min-h-screen">
      <ProductsClient initialProducts={products} categories={categories} />
    </div>
  );
}
