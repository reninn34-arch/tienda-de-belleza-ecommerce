import PageForm from "../PageForm";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditPagePage({ params }: Props) {
  const { id } = await params;
  return <PageForm id={id} />;
}
