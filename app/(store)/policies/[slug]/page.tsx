import { notFound } from "next/navigation";
import Link from "next/link";
import { getPolicies, getPolicyBySlug } from "@/lib/data";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return (await getPolicies()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const policy = await getPolicyBySlug(slug);
  return { title: policy?.title ?? "Política" };
}

function renderMarkdown(text: string) {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    if (line.startsWith("# ")) {
      return <h1 key={i} className="font-headline text-4xl text-primary mb-8 mt-2">{line.slice(2)}</h1>;
    }
    if (line.startsWith("## ")) {
      return <h2 key={i} className="font-headline text-2xl text-primary mb-4 mt-8">{line.slice(3)}</h2>;
    }
    if (line.startsWith("### ")) {
      return <h3 key={i} className="font-bold text-primary text-lg mb-3 mt-6">{line.slice(4)}</h3>;
    }
    if (line.trim() === "") {
      return <br key={i} />;
    }
    // Inline bold/italic
    const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return (
      <p key={i} className="text-on-surface-variant leading-relaxed mb-2">
        {parts.map((part, j) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return <strong key={j} className="text-primary font-semibold">{part.slice(2, -2)}</strong>;
          }
          if (part.startsWith("*") && part.endsWith("*")) {
            return <em key={j}>{part.slice(1, -1)}</em>;
          }
          return part;
        })}
      </p>
    );
  });
}

export default async function PolicyPage({ params }: Props) {
  const { slug } = await params;
  const policy = await getPolicyBySlug(slug);
  if (!policy) notFound();

  const allPolicies = await getPolicies();

  return (
    <div className="min-h-screen bg-surface-container-lowest pt-32 pb-24">
      <div className="max-w-[1440px] mx-auto px-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-16">

          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <div className="sticky top-32">
              <p className="font-label text-[10px] uppercase tracking-[0.3em] text-secondary font-bold mb-6">Políticas</p>
              <nav className="flex flex-col gap-2">
                {allPolicies.map((p) => (
                  <Link
                    key={p.slug}
                    href={`/policies/${p.slug}`}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${
                      p.slug === slug
                        ? "bg-primary text-white font-semibold"
                        : "text-on-surface-variant hover:bg-primary/5 hover:text-primary"
                    }`}
                  >
                    <span className={`material-symbols-outlined text-[18px] ${p.slug === slug ? "text-white" : ""}`}>
                      {p.icon || "description"}
                    </span>
                    {p.title}
                  </Link>
                ))}
              </nav>
            </div>
          </aside>

          {/* Content */}
          <main className="lg:col-span-3">
            <article className="bg-white rounded-2xl shadow-sm border border-outline-variant/10 p-10 md:p-14">
              {renderMarkdown(policy.content)}
            </article>
            <p className="text-[10px] text-on-surface-variant/50 uppercase tracking-widest mt-8 text-center">
              © {new Date().getFullYear()} The Editorial Alchemist
            </p>
          </main>

        </div>
      </div>
    </div>
  );
}
