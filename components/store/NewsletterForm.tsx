"use client";

import { useState } from "react";

interface Props {
  formType?: "email" | "contact";
  buttonText?: string;
  whatsapp?: string;
}

export default function NewsletterForm({ formType = "email", buttonText = "Suscribirse", whatsapp = "" }: Props) {
  const [sent, setSent] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const phone = whatsapp.replace(/\D/g, "");
    let text = "";
    if (formType === "contact") {
      text = `¡Hola! Me comunico desde el formulario de contacto.\nNombre: ${name}\nCorreo: ${email}`;
      if (phone) text += `\nTeléfono: ${phone}`;
      if (message) text += `\nMensaje: ${message}`;
    } else {
      text = `¡Hola! Quiero suscribirme al newsletter.\nCorreo: ${email}`;
    }
    if (phone) {
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
          <span className="material-symbols-outlined text-2xl text-white">check_circle</span>
        </div>
        <p className="text-white font-headline text-lg">¡Gracias por unirte!</p>
        <p className="text-on-primary/60 text-sm">Te contactaremos pronto.</p>
      </div>
    );
  }

  if (formType === "contact") {
    return (
      <form onSubmit={handleSubmit} className="space-y-3 text-left">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-on-primary/60 mb-1.5">Nombre</label>
            <input
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-white/60 transition-colors placeholder:text-on-primary/30"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-on-primary/60 mb-1.5">Correo</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-white/60 transition-colors placeholder:text-on-primary/30"
            />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-on-primary/60 mb-1.5">Teléfono (opcional)</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 000 000 0000"
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-white/60 transition-colors placeholder:text-on-primary/30"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-on-primary/60 mb-1.5">Mensaje (opcional)</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="¿En qué te podemos ayudar?"
            rows={3}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-white/60 transition-colors placeholder:text-on-primary/30 resize-none"
          />
        </div>
        <button
          type="submit"
          className="w-full sm:w-auto bg-white text-primary px-10 py-3.5 rounded-lg font-label text-xs uppercase tracking-[0.2em] font-bold hover:bg-white/90 transition-all"
        >
          {buttonText}
        </button>
      </form>
    );
  }

  // Default: email only
  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
      <input
        required
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Ingresa tu correo electrónico"
        className="bg-white/10 border border-white/20 rounded-lg flex-1 px-5 py-3.5 text-sm text-white focus:outline-none focus:border-white/60 transition-colors placeholder:text-on-primary/40"
      />
      <button
        type="submit"
        className="flex-shrink-0 bg-white text-primary px-8 py-3.5 rounded-lg font-label text-xs uppercase tracking-[0.2em] font-bold hover:bg-white/90 transition-all"
      >
        {buttonText}
      </button>
    </form>
  );
}
