import Link from "next/link";
import Image from "next/image";
import { getTutorials } from "@/lib/data";


const SHOP_ITEMS = [
  {
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuD_KpHb21XBpdlZqbbVjiYHOV8-9JWQZRfx1MDeu2HrMhNgp2-_FrW3BTR6PDQt9qSk4VFHF-M-uPZGIpaqdvAM5Rc7T5eLFPgm8Z48Th6IWNNYItb3dnpZpahhPmDPEy_kXGhBugmRt4pIs6VOsDt24kV1QHdIQ7UMGCJTrqvL67BqlBRU05dlL6COlmooKsEeuhIvlM_FqKp-G0VYZJj07gCK20Vco1HRxVqvyALX6_PJRgblrk2Ol_Peb0yAn7OMM1gc8ieHMU4",
    category: "Herramienta de Precisión",
    name: "El Pincel Alquimista",
    price: "$24.00",
  },
  {
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDjkSWoduw4m7q76IW3URxed61JaqFBrK6oVbOKcnxvvxCbh8kJo7dRvnqkubkX9tXx4vkFkyQ3rzL7yW9O3Z2VcYwCS2fZ5IJjxixCwzrI9-hgvgc_z3dgGXLc0jTd7F_vTO_gJYPGt0qpLG8c3Toq9F1gcCRRSviGcnyWLbzefxc66flomdSnyBDERzWG-jcRNAxTKSUwi2asvNW8SRmEAN6sosAcXxDFplLKNWB7YCpWBjaXAYJicJ_N53sK_usBch2YwO0Vgx8",
    category: "Concentrado",
    name: "Pigmento Ciruela de Medianoche",
    price: "$48.00",
  },
  {
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCIVF03f9_sniImQ29aDF9_KMYcy6UIFWRn6TGjdZ4i7kMQzSpbQM0DvZVJbeFyyIzmQ5qw2Ab7IO0aN1wHBIzAllTOwUBUgdrEFPXe0a_9aZxbe2RuVxUeMHy7dVPhW22GF6_lqqi_IGykJ5og_JdbECJFUvT9iCFEsU8vKXEsg-xM7H_dHRbO3kyA7iB8ZY5UjxgQLVjQBbS3G1brMmYq95HdK0b0GpsZvAknh7taS2frtTFw_XPDxm8D9vMasPVMUFYhugBAHCQ",
    category: "Cuidado Post-Color",
    name: "Mascarilla Sello de Terciopelo",
    price: "$36.00",
  },
  {
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDx2VF_FK4_LLATx2PBQbsPsKZ7QNwwjlJ0xvBnu3GO-Xim4VlFtlvSZu-jHP5QKxHW4ifCZ30-YdSeXaqvbjVI3T4dumiBhckvqhJ96kuk1lq2LpH5xwX0qO5oBib_IZ2tbhcqd8AEwzrqaVJm9qz3N73KCbblKSNOqQ3nqUzHTRjovIXdk9oBlvcgHcDrj9eZ78fZn4WPdb0ZWpetTHV7b_ij-vq7bJfBT9NS-jiEC2jcMtOBZbL3LKTa6m9S0cYro7z2-sAQcHw",
    category: "Acabado",
    name: "Elixir Luminoso",
    price: "$52.00",
  },
];

export default async function TutorialsPage() {
  const tutorials = await getTutorials();
  const VIDEO_CARDS = tutorials.videos;
  const FAQ = tutorials.faq;

  return (
    <div className="pt-20 min-h-screen bg-background">
      {/* ── Hero ── */}
      <header className="relative min-h-[60vh] md:h-[870px] flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            className="object-cover"
            alt="Preparación profesional de tinte ciruela en tazón de cerámica"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCpH4tchDeWhkTK0DuAWIjl7Z_y17St4KMkQKadpe10ouE5TkKGyLVWzROkzCQy-oyiL3FbHAZvDQCmCwidyZQWu3hIeC4tvAQ4PYGBA4vjRgdF8pP0MqmWyLhDPUjhP5ZgNe4kSHj_rlwgyCyPgKn9NPLFrDYWp4EKNpYS5dcTT6wwxJcxSWOL_W9116e5Y2ukF-_ZL8o0aZ2DebRGA5TZnPeV4ENMSZTC2i12UFIlUfmrR_GN0JyS1cskvDq4alaqz0ApKGW5xd8"
            fill
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/60 to-transparent" />
        </div>
        <div className="relative z-10 px-6 md:px-12 max-w-7xl mx-auto w-full">
          <div className="max-w-2xl">
            <span className="font-label text-xs md:text-sm uppercase tracking-[0.3em] text-secondary-container mb-4 block">
              La Clase Maestra
            </span>
            <h1 className="font-headline text-4xl md:text-7xl text-on-primary mb-6 md:mb-8 leading-[1.1]">
              El Arte del <br />
              <span className="italic">Color</span>
            </h1>
            <p className="text-on-primary/80 text-base md:text-lg mb-8 md:mb-10 max-w-md font-body leading-relaxed">
              Transforma tu ritual. Descubre los secretos profesionales para un color vibrante y
              profundo desde la comodidad de tu tocador.
            </p>
            <button className="bg-gradient-to-r from-primary to-primary-container text-on-primary px-10 py-4 rounded-md font-label uppercase tracking-widest text-xs hover:opacity-90 transition-all shadow-lg">
              Comenzar el Ritual
            </button>
          </div>
        </div>
      </header>

      {/* ── Sección 1: Dominando el Ritual ── */}
      <section className="py-16 md:py-32 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-8 md:mb-16 gap-4">
          <div>
            <span className="text-secondary font-label text-sm uppercase tracking-widest mb-2 block">
              Galería de Técnicas
            </span>
            <h2 className="font-headline text-4xl text-primary">Dominando el Ritual</h2>
          </div>
          <a
            className="text-primary font-label text-sm border-b border-secondary pb-1 hover:text-secondary transition-colors"
            href="#"
          >
            Ver Todas las Lecciones
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          {VIDEO_CARDS.map((card) => (
            <div key={card.title} className="group cursor-pointer">
              <div className="relative aspect-[4/5] overflow-hidden mb-6 rounded-lg bg-surface-container-low">
                <Image
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                  alt={card.title}
                  src={card.image}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                />
                {/* Play overlay */}
                <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                  <div className="w-16 h-16 rounded-full border border-on-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-on-primary text-4xl">play_arrow</span>
                  </div>
                </div>
                {/* Badges */}
                <div className="absolute bottom-6 left-6 flex space-x-3">
                  <span className="bg-white/90 backdrop-blur text-[10px] uppercase tracking-tighter px-3 py-1 rounded-full text-primary font-bold">
                    {card.level}
                  </span>
                  <span className="bg-white/90 backdrop-blur text-[10px] uppercase tracking-tighter px-3 py-1 rounded-full text-primary font-bold">
                    {card.duration}
                  </span>
                </div>
              </div>
              <h3 className="font-headline text-2xl text-primary mb-2">{card.title}</h3>
              <p className="text-on-surface-variant font-body text-sm leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Sección 2: Perspectivas Editoriales ── */}
      <section className="bg-surface-container-low py-16 md:py-32">
        <div className="px-6 md:px-12 max-w-7xl mx-auto">
          <div className="text-center mb-10 md:mb-20">
            <h2 className="font-headline text-3xl md:text-5xl text-primary mb-4 italic">
              Perspectivas Editoriales
            </h2>
            <p className="text-on-surface-variant font-body max-w-lg mx-auto">
              Análisis profundos sobre teoría del color y los secretos profesionales del cuidado capilar.
            </p>
          </div>

          <div className="grid grid-cols-12 gap-8">
            {/* Large card */}
            <div className="col-span-12 md:col-span-7 h-[300px] md:h-[600px] relative group overflow-hidden rounded-xl">
              <Image
                className="object-cover transition-transform duration-1000 group-hover:scale-105"
                alt="Revistas y frascos de botica sobre mármol"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBwI_0xF-I9cpCcCfdQRtUVNpn9lxScPpns1cQLTlfCixm7gdsZ9be123pbheyCifSPNDEB9PHgbDSgoka2Mj5w8g9r5yaPxuiA8zTSV4MSzOfvNF6L--ogCboeHeGdm30teRydMzAKNwzgpwZz6FcXwSlHXhwfejwgppIVdqO9es1Dbd_eVA7zF8j_PEyC-_vBmv31TvhfALLlaXZJ5mJzH1PuCJRu4ow1cJqK1gCDVCWJSnShc9Lz2HAjcXbQMijmNtV54Nvt0E0"
                fill
                sizes="(min-width: 1024px) 60vw, 100vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 md:bottom-10 md:left-10 md:right-10">
                <span className="text-secondary-container font-label text-xs uppercase tracking-widest mb-3 block">
                  Teoría y Práctica
                </span>
                <h3 className="font-headline text-2xl md:text-4xl text-on-primary mb-3 md:mb-4">
                  Entendiendo el Tono vs. el Nivel
                </h3>
                <p className="text-on-primary/70 mb-6 font-body">
                  La ciencia de neutralizar el bronce y conseguir tu tono soñado mediante el dominio
                  de la rueda cromática.
                </p>
                <a
                  className="inline-flex items-center text-on-primary font-label text-xs uppercase tracking-widest hover:translate-x-2 transition-transform"
                  href="#"
                >
                  Leer la Guía
                  <span className="material-symbols-outlined ml-2 text-sm">arrow_forward</span>
                </a>
              </div>
            </div>

            {/* Two small cards */}
            <div className="col-span-12 md:col-span-5 flex flex-col gap-8">
              <div className="flex-1 bg-surface-container-lowest p-10 rounded-xl relative overflow-hidden group">
                <div className="relative z-10">
                  <span className="text-secondary font-label text-[10px] uppercase tracking-widest mb-4 block">
                    Preparación Pre-Color
                  </span>
                  <h3 className="font-headline text-2xl text-primary mb-4">El Ritual Detox</h3>
                  <p className="text-on-surface-variant text-sm font-body mb-6">
                    Por qué la eliminación de minerales es el paso más omitido y, a la vez, el más
                    crucial para lograr un color uniforme.
                  </p>
                  <a
                    className="text-primary font-bold text-xs uppercase tracking-widest border-b border-primary/20 pb-1"
                    href="#"
                  >
                    Aprender Más
                  </a>
                </div>
                <span className="absolute -right-4 -bottom-4 text-9xl opacity-[0.03] font-headline italic text-primary select-none">
                  02
                </span>
              </div>

              <div className="flex-1 bg-surface-container-lowest p-10 rounded-xl relative overflow-hidden group">
                <div className="relative z-10">
                  <span className="text-secondary font-label text-[10px] uppercase tracking-widest mb-4 block">
                    Cuidado Post-Color
                  </span>
                  <h3 className="font-headline text-2xl text-primary mb-4">Brillo y Longevidad</h3>
                  <p className="text-on-surface-variant text-sm font-body mb-6">
                    Los cinco ingredientes que debes buscar en tu mascarilla para prevenir la
                    oxidación y el desteñimiento.
                  </p>
                  <a
                    className="text-primary font-bold text-xs uppercase tracking-widest border-b border-primary/20 pb-1"
                    href="#"
                  >
                    Aprender Más
                  </a>
                </div>
                <span className="absolute -right-4 -bottom-4 text-9xl opacity-[0.03] font-headline italic text-primary select-none">
                  03
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Sección 3: Pregunta al Alquimista ── */}
      <section className="py-16 md:py-32 px-6 md:px-12 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-20">
          <div>
            <h2 className="font-headline text-3xl md:text-4xl text-primary mb-6">
              Pregunta al <br />
              <span className="italic text-secondary">Alquimista</span>
            </h2>
            <p className="text-on-surface-variant font-body mb-8">
              Nuestros coloristas expertos responden tus consultas de belleza más urgentes. ¿No
              encuentras lo que buscas? Contáctanos para una consulta privada.
            </p>
            <button className="border border-outline-variant text-primary px-8 py-3 rounded-md font-label uppercase tracking-widest text-[10px] hover:bg-surface-container-high transition-colors">
              Contactar a un Experto
            </button>
          </div>

          <div className="space-y-8">
            {FAQ.map((item) => (
              <div key={item.q} className="border-b border-outline-variant/30 pb-6">
                <h4 className="font-headline text-lg text-primary mb-3">{item.q}</h4>
                <p className="text-on-surface-variant font-body text-sm">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Sección 4: Compra los Esenciales ── */}
      <section className="py-16 md:py-32 bg-surface">
        <div className="px-6 md:px-12 max-w-7xl mx-auto">
          <h2 className="font-headline text-2xl md:text-3xl text-primary mb-8 md:mb-12 text-center">
            Compra los Esenciales
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {SHOP_ITEMS.map((item) => (
              <div key={item.name} className="text-center group">
                <div className="bg-surface-container-lowest aspect-square p-8 mb-4 overflow-hidden relative">
                  <Image
                    className="object-contain mix-blend-multiply group-hover:scale-110 transition-transform"
                    alt={item.name}
                    src={item.image}
                    fill
                    sizes="(min-width: 768px) 25vw, 50vw"
                  />
                  <button className="absolute bottom-0 left-0 right-0 bg-primary text-on-primary py-3 translate-y-full group-hover:translate-y-0 transition-transform font-label text-[10px] uppercase tracking-widest">
                    Agregar
                  </button>
                </div>
                <p className="font-label text-[10px] uppercase tracking-widest text-secondary mb-1">
                  {item.category}
                </p>
                <h3 className="font-headline text-lg text-primary">{item.name}</h3>
                <p className="text-on-surface-variant font-body text-sm mt-1">{item.price}</p>
              </div>
            ))}
          </div>

          {/* Link to real products */}
          <div className="mt-16 text-center">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-primary hover:text-secondary transition-colors border-b border-primary/20 pb-1"
            >
              Ver Todos los Productos
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── CTA Newsletter ── */}
      <section className="bg-primary py-16 md:py-24 px-6 md:px-8 text-center">
        <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/50 block mb-6">
          El Círculo Íntimo
        </span>
        <h3 className="font-headline text-4xl md:text-5xl text-white mb-6 italic">
          Nuevas lecciones cada semana
        </h3>
        <p className="text-sm text-white/60 font-light mb-12 max-w-md mx-auto leading-relaxed">
          Únete a más de 12 000 alquimistas y recibe tutoriales exclusivos, acceso anticipado a
          nuevos tonos y consejos de nuestros coloristas en tu bandeja de entrada.
        </p>
        <div className="flex max-w-sm mx-auto border-b border-white/30">
          <input
            className="flex-1 bg-transparent border-none text-white text-xs font-label uppercase tracking-widest placeholder:text-white/30 focus:ring-0 py-3"
            placeholder="Tu correo electrónico"
            type="email"
          />
          <button className="text-white font-bold text-[10px] uppercase tracking-widest hover:text-secondary-container transition-colors pl-4">
            Unirme
          </button>
        </div>
      </section>
    </div>
  );
}
