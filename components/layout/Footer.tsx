"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LogoMark } from "@/components/brand";
import { getButtonClassName } from "@/components/ui";

const footerSections = [
  {
    title: "Tienda",
    links: [
      { label: "Catálogo", href: "/catalogo" },
      { label: "Celulares", href: "/catalogo?categoria=celulares" },
      { label: "GPU", href: "/catalogo?categoria=tarjetas-graficas" },
      { label: "CPU/RAM", href: "/catalogo?categoria=cpu-ram" },
      { label: "Monitores", href: "/catalogo?categoria=monitores" },
      { label: "Periféricos", href: "/catalogo?categoria=perifericos" },
    ],
  },
  {
    title: "Soporte",
    links: [
      { label: "Cuenta", href: "/cuenta" },
      { label: "Carrito", href: "/carrito" },
      { label: "Newsletter", href: "#newsletter" },
    ],
  },
];

export function Footer() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleNewsletterSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("Registro mock recibido.");
    setEmail("");
  };

  return (
    <footer className="artech-footer relative z-10 px-4 py-12 text-text-primary-on-dark sm:px-6 lg:py-16">
      <div className="artech-footer-content mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.3fr_0.8fr_0.8fr_1.1fr]">
        <div>
          <Link
            href="/"
            className="artech-footer-logo inline-flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            <LogoMark className="text-2xl" />
            <span className="text-base font-medium">Artech</span>
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-6 text-text-secondary-on-dark">
            Tecnología y electrónica con una experiencia minimalista, clara y
            accesible.
          </p>
        </div>

        {footerSections.map((section) => (
          <div key={section.title}>
            <h2 className="text-sm font-medium text-text-primary-on-dark">
              {section.title}
            </h2>
            <nav aria-label={section.title} className="mt-4 grid gap-3">
              {section.links.map((link) => (
                <Link
                  key={link.href + link.label}
                  href={link.href}
                  className="artech-footer-link text-sm text-text-secondary-on-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        ))}

        <form id="newsletter" onSubmit={handleNewsletterSubmit}>
          <h2 className="text-sm font-medium text-text-primary-on-dark">
            Newsletter
          </h2>
          <label className="mt-4 grid gap-2 text-sm text-text-secondary-on-dark">
            Correo
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tu@email.com"
              className="artech-footer-input h-10 rounded-input px-3 text-text-primary-on-dark placeholder:text-text-secondary-on-dark"
            />
          </label>
          <button
            type="submit"
            className={getButtonClassName(
              "primary-on-dark",
              "artech-footer-submit mt-3 min-h-9 px-4",
            )}
          >
            Suscribirme
            <ArrowRight size={16} strokeWidth={1.7} aria-hidden="true" />
          </button>
          {message ? (
            <p className="mt-3 text-sm text-text-secondary-on-dark" role="status">
              {message}
            </p>
          ) : null}
        </form>
      </div>
      <div className="artech-footer-bottom mx-auto mt-10 flex max-w-6xl flex-col gap-3 pt-6 text-sm text-text-secondary-on-dark sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 Artech. Todos los derechos reservados.</p>
        <div className="flex gap-4" aria-label="Redes sociales">
          <span>Instagram</span>
          <span>Facebook</span>
          <span>X</span>
        </div>
      </div>
    </footer>
  );
}
