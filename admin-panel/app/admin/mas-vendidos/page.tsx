import CuratedPageEditor from "../CuratedPageEditor";

export default function MasVendidosAdminPage() {
  return (
    <CuratedPageEditor
      settingsKey="bestSellers"
      pageTitle="Más Vendidos"
      storeHref="/mas-vendidos"
    />
  );
}
