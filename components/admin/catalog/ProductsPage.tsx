"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PackagePlus,
  Pencil,
  RefreshCw,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui";
import { catalogAdminService } from "@/lib/services/catalogAdminService";
import type {
  AdminCategory,
  AdminProduct,
  AdminProductFilters,
  AdminSaveProductInput,
} from "@/lib/types";
import { AdminModal } from "../AdminModal";
import { useAdminIdentity } from "../AdminContext";
import {
  formatCatalogPrice,
  getCatalogAdminError,
  slugifyInput,
} from "./catalogAdminUi";

type ProductFormValues = {
  name: string;
  sku: string;
  slug: string;
  description: string;
  price: string;
  previousPrice: string;
  categoryId: string;
  brandId: string;
  barcode: string;
  hasRgbLighting: boolean;
  isFeatured: boolean;
  isActive: boolean;
  imagesText: string;
};

function toFormValues(product: AdminProduct | null): ProductFormValues {
  return {
    name: product?.name ?? "",
    sku: product?.sku ?? "",
    slug: product?.slug ?? "",
    description: product?.description ?? "",
    price: product ? product.price.toFixed(2) : "",
    previousPrice:
      product && product.previousPrice !== null
        ? product.previousPrice.toFixed(2)
        : "",
    categoryId: product?.category.id ?? "",
    brandId: product?.brand?.id ?? "",
    barcode: product?.barcode ?? "",
    hasRgbLighting: product?.hasRgbLighting ?? false,
    isFeatured: product?.isFeatured ?? false,
    isActive: product?.isActive ?? true,
    imagesText: product ? product.images.map((image) => image.url).join("\n") : "",
  };
}

function ProductFormDialog({
  product,
  categories,
  brands,
  onClose,
  onSaved,
}: {
  product: AdminProduct | null;
  categories: AdminCategory[];
  brands: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [values, setValues] = useState<ProductFormValues>(() =>
    toFormValues(product),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const update = <K extends keyof ProductFormValues>(
    key: K,
    value: ProductFormValues[K],
  ) => setValues((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const images = values.imagesText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const input: AdminSaveProductInput = {
      name: values.name.trim(),
      sku: values.sku.trim(),
      description: values.description.trim(),
      price: values.price.trim().replace(",", "."),
      previousPrice: values.previousPrice.trim()
        ? values.previousPrice.trim().replace(",", ".")
        : null,
      categoryId: values.categoryId,
      brandId: values.brandId || null,
      barcode: values.barcode.trim() || null,
      hasRgbLighting: values.hasRgbLighting,
      isFeatured: values.isFeatured,
      isActive: values.isActive,
      images,
    };

    if (!input.name || !input.sku || !input.description || !input.price) {
      setError("Completa nombre, SKU, descripcion y precio.");
      return;
    }
    if (!input.categoryId) {
      setError("Selecciona una categoria activa.");
      return;
    }
    if (!product && values.slug.trim()) {
      input.slug = slugifyInput(values.slug);
    }

    setIsSubmitting(true);
    setError("");

    try {
      if (product) {
        await catalogAdminService.updateProduct(product.id, input);
        onSaved(`Producto ${input.name} actualizado.`);
      } else {
        await catalogAdminService.createProduct(input);
        onSaved(`Producto ${input.name} creado con stock 0. Registra entradas desde Inventario.`);
      }
    } catch (submitError: unknown) {
      setError(
        getCatalogAdminError(
          submitError,
          "No pudimos guardar el producto. Intenta nuevamente.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeCategories = categories.filter((category) => category.isActive);
  const selectedCategoryMissing =
    values.categoryId &&
    !activeCategories.some((category) => category.id === values.categoryId);

  return (
    <AdminModal
      open
      title={product ? `Editar producto - ${product.sku}` : "Agregar producto"}
      description={
        product
          ? "El stock se gestiona desde el modulo Inventario; aqui solo datos del producto."
          : "El producto se crea con stock 0. Usa Inventario para registrar la primera entrada."
      }
      onClose={onClose}
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="admin-form-label">
            Nombre
            <input
              className="admin-form-control"
              value={values.name}
              maxLength={150}
              onChange={(event) => update("name", event.target.value)}
              required
            />
          </label>
          <label className="admin-form-label">
            SKU
            <input
              className="admin-form-control font-mono"
              value={values.sku}
              maxLength={64}
              onChange={(event) => update("sku", event.target.value.toUpperCase())}
              disabled={Boolean(product)}
              required
            />
          </label>
          <label className="admin-form-label">
            Slug {product ? "(solo lectura en publicacion)" : ""}
            <input
              className="admin-form-control font-mono"
              value={values.slug}
              maxLength={120}
              placeholder="se genera desde el nombre"
              readOnly={Boolean(product)}
              onChange={(event) => update("slug", event.target.value)}
            />
          </label>
          <label className="admin-form-label">
            Categoria
            <select
              className="admin-form-control"
              value={values.categoryId}
              onChange={(event) => update("categoryId", event.target.value)}
              required
            >
              <option value="" disabled>
                Selecciona una categoria
              </option>
              {activeCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          {selectedCategoryMissing ? (
            <p className="text-xs text-amber-300 sm:col-span-2">
              La categoria actual esta inactiva; selecciona otra para guardar.
            </p>
          ) : null}
          <label className="admin-form-label">
            Marca
            <select
              className="admin-form-control"
              value={values.brandId}
              onChange={(event) => update("brandId", event.target.value)}
            >
              <option value="">Sin marca</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-form-label">
            Codigo de barras
            <input
              className="admin-form-control"
              value={values.barcode}
              maxLength={64}
              onChange={(event) => update("barcode", event.target.value)}
            />
          </label>
          <label className="admin-form-label">
            Precio (GTQ)
            <input
              className="admin-form-control"
              value={values.price}
              inputMode="decimal"
              pattern="\d+(\.\d{1,2})?"
              onChange={(event) => update("price", event.target.value)}
              required
            />
          </label>
          <label className="admin-form-label">
            Precio anterior (opcional)
            <input
              className="admin-form-control"
              value={values.previousPrice}
              inputMode="decimal"
              pattern="\d+(\.\d{1,2})?"
              onChange={(event) => update("previousPrice", event.target.value)}
            />
          </label>
        </div>

        <label className="admin-form-label">
          Descripcion
          <textarea
            className="admin-form-control min-h-24 resize-y"
            value={values.description}
            maxLength={3000}
            onChange={(event) => update("description", event.target.value)}
            required
          />
        </label>

        <label className="admin-form-label">
          Imagenes (una URL o ruta por linea, la primera es principal)
          <textarea
            className="admin-form-control min-h-20 resize-y font-mono text-xs"
            value={values.imagesText}
            placeholder={"/assets/products/categoria/producto.png"}
            onChange={(event) => update("imagesText", event.target.value)}
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex items-center gap-3 rounded-lg border border-white/[0.08] bg-white/[0.025] px-4 py-3 text-sm text-white/75">
            <input
              type="checkbox"
              checked={values.isActive}
              onChange={(event) => update("isActive", event.target.checked)}
            />
            Activo
          </label>
          <label className="flex items-center gap-3 rounded-lg border border-white/[0.08] bg-white/[0.025] px-4 py-3 text-sm text-white/75">
            <input
              type="checkbox"
              checked={values.hasRgbLighting}
              onChange={(event) => update("hasRgbLighting", event.target.checked)}
            />
            RGB
          </label>
          <label className="flex items-center gap-3 rounded-lg border border-white/[0.08] bg-white/[0.025] px-4 py-3 text-sm text-white/75">
            <input
              type="checkbox"
              checked={values.isFeatured}
              onChange={(event) => update("isFeatured", event.target.checked)}
            />
            Destacado
          </label>
        </div>

        <p className="min-h-5 text-sm text-white/65" role="alert" aria-live="polite">
          {error}
        </p>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            variant="outline-on-dark"
            className="rounded-lg border-white/10"
            disabled={isSubmitting}
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary-on-dark"
            className="rounded-lg"
            isLoading={isSubmitting}
            loadingLabel="Guardando..."
          >
            Guardar producto
          </Button>
        </div>
      </form>
    </AdminModal>
  );
}

export function ProductsPage() {
  const identity = useAdminIdentity();
  const canManage = identity.permissions.includes("catalog.manage");

  const [products, setProducts] = useState<AdminProduct[] | null>(null);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [brands, setBrands] = useState<Array<{ id: string; name: string }>>([]);
  const [filters, setFilters] = useState<AdminProductFilters>({ status: "all" });
  const [searchDraft, setSearchDraft] = useState("");
  const [listError, setListError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminProduct | null>(null);

  const loadProducts = useCallback(
    async (signal?: AbortSignal) => {
      setListError("");
      try {
        setProducts(await catalogAdminService.listProducts(filters, signal));
      } catch (loadError: unknown) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") {
          return;
        }
        setProducts([]);
        setListError(
          getCatalogAdminError(loadError, "No se pudo cargar el catalogo."),
        );
      }
    },
    [filters],
  );

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => void loadProducts(controller.signal));
    return () => controller.abort();
  }, [loadProducts]);

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      void Promise.all([
        catalogAdminService.listCategories(controller.signal),
        canManage ? catalogAdminService.listBrands(controller.signal) : Promise.resolve([]),
      ])
        .then(([categoryResult, brandResult]) => {
          setCategories(categoryResult);
          setBrands(brandResult);
        })
        .catch(() => {
          // Los selects se quedan vacios; el listado principal sigue usable.
        });
    });
    return () => controller.abort();
  }, [canManage]);

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setListError("");
    setProducts(null);
    setFilters((current) => ({ ...current, search: searchDraft.trim() }));
  };

  const toggleActive = async (product: AdminProduct) => {
    setStatusMessage("");
    try {
      await catalogAdminService.updateProduct(product.id, {
        isActive: !product.isActive,
      });
      setStatusMessage(
        product.isActive
          ? `${product.name} fue desactivado. El historial de ventas se conserva.`
          : `${product.name} fue activado.`,
      );
      void loadProducts();
    } catch (toggleError: unknown) {
      setStatusMessage(
        getCatalogAdminError(toggleError, "No pudimos cambiar el estado."),
      );
    }
  };

  const rows = useMemo(() => products ?? [], [products]);

  return (
    <div>
      <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-medium uppercase text-white/45">
            Operaciones / Catalogo
          </p>
          <h1 className="mt-3 text-3xl font-medium leading-tight text-white sm:text-4xl">
            Productos
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/55 sm:text-base sm:leading-7">
            Mismo catalogo compartido con la tienda publica y POS. El stock se
            administra desde Inventario.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline-on-dark"
            className="rounded-lg border-white/10"
            onClick={() => void loadProducts()}
            disabled={products === null}
          >
            <RefreshCw aria-hidden="true" size={16} />
            Actualizar
          </Button>
          {canManage ? (
            <Button
              variant="primary-on-dark"
              className="rounded-lg px-4"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <PackagePlus aria-hidden="true" size={16} />
              Agregar producto
            </Button>
          ) : null}
        </div>
      </header>

      <p className="mt-5 min-h-5 text-sm text-white/65" aria-live="polite">
        {statusMessage}
      </p>

      <section className="admin-panel mt-3 p-4 sm:p-5" aria-label="Filtros de productos">
        <form
          className="grid gap-4 lg:grid-cols-[minmax(15rem,1fr)_12rem_12rem_auto] lg:items-end"
          onSubmit={handleSearch}
        >
          <label className="admin-form-label min-w-0">
            Buscar
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35"
                size={17}
                strokeWidth={1.6}
              />
              <input
                className="admin-form-control pl-10"
                value={searchDraft}
                placeholder="Nombre o SKU"
                onChange={(event) => setSearchDraft(event.target.value)}
              />
            </div>
          </label>
          <label className="admin-form-label">
            Categoria
            <select
              className="admin-form-control"
              value={filters.categoryId ?? ""}
              onChange={(event) => {
                setListError("");
                setProducts(null);
                setFilters((current) => ({
                  ...current,
                  categoryId: event.target.value || undefined,
                }));
              }}
            >
              <option value="">Todas</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                  {category.isActive ? "" : " (inactiva)"}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-form-label">
            Estado
            <select
              className="admin-form-control"
              value={filters.status ?? "all"}
              onChange={(event) => {
                setListError("");
                setProducts(null);
                setFilters((current) => ({
                  ...current,
                  status: event.target.value as AdminProductFilters["status"],
                }));
              }}
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </label>
          <Button
            type="submit"
            variant="outline-on-dark"
            className="min-h-11 rounded-lg border-white/10 px-4"
          >
            Aplicar
          </Button>
        </form>
      </section>

      {listError ? (
        <div className="admin-empty-panel mt-4 px-5 py-4" role="alert">
          <p className="text-sm font-medium text-white">{listError}</p>
        </div>
      ) : null}

      <section className="mt-6" aria-labelledby="products-list-heading">
        <p className="text-sm text-white/45">
          {products ? `${rows.length} productos` : "Cargando productos..."}
        </p>

        {products === null ? (
          <div className="mt-4 grid gap-3" role="status">
            <span className="sr-only">Cargando productos...</span>
            <div className="admin-skeleton h-16 rounded-md" />
            <div className="admin-skeleton h-16 rounded-md" />
            <div className="admin-skeleton h-16 rounded-md" />
          </div>
        ) : rows.length === 0 ? (
          <div className="admin-empty-panel mt-4 px-5 py-8">
            <p className="text-sm font-medium text-white">
              No hay productos que coincidan con los filtros.
            </p>
          </div>
        ) : (
          <>
            <div className="admin-table-wrap mt-4 hidden lg:block">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Imagen</th>
                    <th>SKU</th>
                    <th>Producto</th>
                    <th>Categoria</th>
                    <th>Precio</th>
                    <th>Stock</th>
                    <th>Estado</th>
                    {canManage ? <th><span className="sr-only">Acciones</span></th> : null}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((product) => (
                    <tr key={product.id}>
                      <td>
                        {product.images[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.images[0].url}
                            alt={product.name}
                            className="h-10 w-14 rounded-md object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="h-10 w-14 rounded-md border border-white/10 bg-white/[0.04]" />
                        )}
                      </td>
                      <td className="font-mono text-xs text-white/55">{product.sku}</td>
                      <td className="font-medium text-white">{product.name}</td>
                      <td>{product.category.name}</td>
                      <td className="font-medium text-white">
                        {formatCatalogPrice(product.price)}
                      </td>
                      <td>
                        {product.availableQuantity}
                        {!product.hasInventoryRecord ? (
                          <span className="ml-2 text-xs text-white/40">sin registro</span>
                        ) : null}
                      </td>
                      <td>
                        <span
                          className={`inline-flex min-h-7 items-center rounded-full border px-2.5 text-xs font-medium ${
                            product.isActive
                              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                              : "border-white/15 bg-white/[0.05] text-white/55"
                          }`}
                        >
                          {product.isActive ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      {canManage ? (
                        <td className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline-on-dark"
                              className="min-h-9 rounded-lg border-white/10 px-3 text-xs"
                              onClick={() => {
                                setEditing(product);
                                setFormOpen(true);
                              }}
                            >
                              <Pencil aria-hidden="true" size={14} />
                              Editar
                            </Button>
                            <Button
                              variant="outline-on-dark"
                              className="min-h-9 rounded-lg border-white/10 px-3 text-xs"
                              onClick={() => void toggleActive(product)}
                            >
                              {product.isActive ? "Desactivar" : "Activar"}
                            </Button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 grid gap-3 lg:hidden">
              {rows.map((product) => (
                <article key={product.id} className="admin-panel p-4">
                  <div className="flex items-start gap-3">
                    {product.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.images[0].url}
                        alt={product.name}
                        className="h-14 w-16 shrink-0 rounded-md object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-14 w-16 shrink-0 rounded-md border border-white/10 bg-white/[0.04]" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">
                        {product.name}
                      </p>
                      <p className="mt-1 font-mono text-xs text-white/40">{product.sku}</p>
                      <p className="mt-1 text-xs text-white/45">
                        {product.category.name} · {formatCatalogPrice(product.price)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${
                        product.isActive
                          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                          : "border-white/15 bg-white/[0.05] text-white/55"
                      }`}
                    >
                      {product.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                  <dl className="mt-3 grid gap-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-white/38">Stock disponible</dt>
                      <dd className="font-medium text-white">
                        {product.availableQuantity}
                      </dd>
                    </div>
                  </dl>
                  {canManage ? (
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <Button
                        variant="outline-on-dark"
                        className="rounded-lg border-white/10"
                        onClick={() => {
                          setEditing(product);
                          setFormOpen(true);
                        }}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="outline-on-dark"
                        className="rounded-lg border-white/10"
                        onClick={() => void toggleActive(product)}
                      >
                        {product.isActive ? "Desactivar" : "Activar"}
                      </Button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {formOpen && canManage ? (
        <ProductFormDialog
          product={editing}
          categories={categories}
          brands={brands}
          onClose={() => setFormOpen(false)}
          onSaved={(message) => {
            setFormOpen(false);
            setEditing(null);
            setStatusMessage(message);
            void loadProducts();
          }}
        />
      ) : null}
    </div>
  );
}
