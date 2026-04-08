import { getFilteredProducts, getCategories } from "@/lib/data";
import ProductsClient from "@/components/store/ProductsClient";

// SSR: Next.js passes URL searchParams as props to Server Components
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  const category = typeof params.category === "string" ? params.category : undefined;
  const maxPrice = typeof params.maxPrice === "string" ? Number(params.maxPrice) : undefined;
  const sort = typeof params.sort === "string" ? params.sort : "featured";
  const page = typeof params.page === "string" ? Number(params.page) : 1;

  const [{ products, totalPages, currentPage, totalItems }, categories] = await Promise.all([
    getFilteredProducts({ category, maxPrice, sort, page, limit: 12 }),
    getCategories(),
  ]);

  return (
    <div className="pt-20 min-h-screen">
      <ProductsClient
        initialProducts={products}
        categories={categories}
        totalPages={totalPages}
        currentPage={currentPage}
        totalItems={totalItems}
        activeCategory={category}
        activeSort={sort}
        activeMaxPrice={maxPrice}
      />
    </div>
  );
}
