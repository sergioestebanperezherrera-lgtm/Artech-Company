import Link from "next/link";
import { LogoMark } from "@/components/brand";

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
    ],
  },
];

export function Footer() {
  return (
    <footer className="artech-footer relative z-10 px-4 py-12 text-text-primary-on-dark sm:px-6 lg:py-16">
      <div className="artech-footer-content mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.3fr_0.8fr_0.8fr]">
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
      </div>
      <div className="artech-footer-bottom mx-auto mt-10 max-w-6xl pt-6 text-sm text-text-secondary-on-dark">
        <p>© 2026 Artech. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}
