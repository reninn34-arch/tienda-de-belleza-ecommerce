import Link from "next/link";
import Image from "next/image";
import CartIcon from "./CartIcon";
import SearchBar from "./SearchBar";
import NavSidebar from "./NavSidebar";
import SocialIcons from "./SocialIcons";
import { getAllPages, getAllProducts, getBranding, getCollectionsPage, getSocialLinks } from "@/lib/data";

export default async function Navbar() {
  const customPages = await getAllPages();
  const products = await getAllProducts();
  const { logoUrl } = await getBranding();
  const collectionsPage = await getCollectionsPage();
  const collections = collectionsPage?.collections ?? [];
  const socialLinks = await getSocialLinks();

  return (
    <header className="fixed top-0 w-full z-50 bg-[#faf9f6]/90 backdrop-blur-md border-b border-outline-variant/10">
      <nav className="relative flex items-center w-full px-8 py-5 max-w-[1920px] mx-auto">

        {/* Left — sidebar trigger */}
        <div className="flex-1 flex items-center">
          <NavSidebar customPages={customPages} collections={collections} socialLinks={socialLinks} />
        </div>

        {/* Center — logo / name */}
        <Link
          href="/"
          className="absolute left-1/2 -translate-x-1/2 flex items-center"
        >
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt="Logo"
              width={160}
              height={40}
              className="h-10 w-40 object-contain"
              sizes="160px"
            />
          ) : (
            <span className="text-2xl font-headline italic text-primary tracking-tight whitespace-nowrap">
              The Editorial Alchemist
            </span>
          )}
        </Link>

        {/* Right — icons */}
        <div className="flex-1 flex items-center justify-end gap-6 text-primary">
          <SocialIcons links={socialLinks} size={16} className="hidden md:flex" />
          <SearchBar products={products} />
          <CartIcon />
        </div>

      </nav>
    </header>
  );
}
