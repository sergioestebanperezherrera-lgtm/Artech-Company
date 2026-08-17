import Link from "next/link";
import { SearchX } from "lucide-react";

export default function ProductNotFound() {
  return (
    <main className="min-h-screen px-6 py-16 text-text-primary-on-dark">
      <div className="mx-auto max-w-2xl rounded-card border border-border-on-dark bg-bg-base/75 px-6 py-12 text-center">
        <SearchX
          aria-hidden="true"
          className="mx-auto text-text-secondary-on-dark"
          size={40}
          strokeWidth={1.5}
        />
        <h1 className="mt-5 text-3xl font-medium">Producto no encontrado</h1>
        <p className="mt-4 text-sm leading-6 text-text-secondary-on-dark">
          El producto que buscas no está disponible en el catálogo actual.
        </p>
        <Link
          href="/catalogo"
          className="mt-7 inline-flex min-h-10 items-center justify-center rounded-pill bg-btn-primary-on-dark-bg px-5 py-2 text-sm font-medium text-btn-primary-on-dark-text transition-colors hover:bg-text-secondary-on-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          Volver al catálogo
        </Link>
      </div>
    </main>
  );
}
