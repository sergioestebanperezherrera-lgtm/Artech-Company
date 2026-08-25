"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Tags } from "lucide-react";
import { Button } from "@/components/ui";
import { catalogAdminService } from "@/lib/services/catalogAdminService";
import type { AdminCategory, AdminSaveCategoryInput } from "@/lib/types";
import { useAdminIdentity } from "../AdminContext";
import { AdminModal } from "../AdminModal";
import { getCatalogAdminError } from "./catalogAdminUi";

function CategoryFormDialog({
  category,
  onClose,
  onSaved,
}: {
  category: AdminCategory | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [icon, setIcon] = useState(category?.icon ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const input: AdminSaveCategoryInput = {
      name: name.trim(),
      description: description.trim() || null,
      icon: icon.trim() || null,
    };

    if (!input.name) {
      setError("El nombre es obligatorio.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      if (category) {
        await catalogAdminService.updateCategory(category.id, input);
        onSaved(`Categoria ${input.name} actualizada.`);
      } else {
        await catalogAdminService.createCategory(input);
        onSaved(`Categoria ${input.name} creada.`);
      }
    } catch (submitError: unknown) {
      setError(
        getCatalogAdminError(
          submitError,
          "No pudimos guardar la categoria. Intenta nuevamente.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminModal
      open
      title={category ? `Editar categoria - ${category.name}` : "Agregar categoria"}
      description={
        category
          ? "El slug no cambia para no romper URLs publicas ni el POS."
          : "El slug se genera automaticamente desde el nombre."
      }
      onClose={onClose}
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <label className="admin-form-label">
          Nombre
          <input
            className="admin-form-control"
            value={name}
            maxLength={100}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </label>
        <label className="admin-form-label">
          Descripcion
          <textarea
            className="admin-form-control min-h-20 resize-y"
            value={description}
            maxLength={500}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <label className="admin-form-label">
          Icono (nombre corto, opcional)
          <input
            className="admin-form-control"
            value={icon}
            maxLength={80}
            placeholder="celulares"
            onChange={(event) => setIcon(event.target.value)}
          />
        </label>

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
            Guardar categoria
          </Button>
        </div>
      </form>
    </AdminModal>
  );
}

export function CategoriesPage() {
  const identity = useAdminIdentity();
  const canManage = identity.permissions.includes("catalog.manage");

  const [categories, setCategories] = useState<AdminCategory[] | null>(null);
  const [listError, setListError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const loadCategories = useCallback(async (signal?: AbortSignal) => {
    setListError("");
    try {
      setCategories(await catalogAdminService.listCategories(signal));
    } catch (loadError: unknown) {
      if (loadError instanceof DOMException && loadError.name === "AbortError") {
        return;
      }
      setCategories([]);
      setListError(
        getCatalogAdminError(loadError, "No se pudieron cargar las categorias."),
      );
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => void loadCategories(controller.signal));
    return () => controller.abort();
  }, [loadCategories]);

  const toggleActive = async (category: AdminCategory) => {
    setStatusMessage("");
    try {
      await catalogAdminService.updateCategory(category.id, {
        isActive: !category.isActive,
      });
      setStatusMessage(
        category.isActive
          ? `${category.name} fue desactivada. Sus productos conservan historial.`
          : `${category.name} fue activada.`,
      );
      void loadCategories();
    } catch (toggleError: unknown) {
      setStatusMessage(
        getCatalogAdminError(toggleError, "No pudimos cambiar el estado."),
      );
    }
  };

  return (
    <div>
      <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-medium uppercase text-white/45">
            Operaciones / Catalogo
          </p>
          <h1 className="mt-3 text-3xl font-medium leading-tight text-white sm:text-4xl">
            Categorias
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/55 sm:text-base sm:leading-7">
            Organizacion del catalogo compartida por tienda publica, POS e
            inventario.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline-on-dark"
            className="rounded-lg border-white/10"
            onClick={() => void loadCategories()}
            disabled={categories === null}
          >
            <RefreshCw aria-hidden="true" size={16} />
            Actualizar
          </Button>
          {canManage ? (
            <Button
              variant="primary-on-dark"
              className="rounded-lg px-4"
              onClick={() => setCreateOpen(true)}
            >
              Agregar categoria
            </Button>
          ) : null}
        </div>
      </header>

      <p className="mt-5 min-h-5 text-sm text-white/65" aria-live="polite">
        {statusMessage}
      </p>

      {listError ? (
        <div className="admin-empty-panel mt-4 px-5 py-4" role="alert">
          <p className="text-sm font-medium text-white">{listError}</p>
        </div>
      ) : null}

      <section className="mt-6" aria-labelledby="categories-heading">
        <h2 id="categories-heading" className="sr-only">
          Listado de categorias
        </h2>
        {categories === null ? (
          <div className="mt-4 grid gap-3" role="status">
            <span className="sr-only">Cargando categorias...</span>
            <div className="admin-skeleton h-14 rounded-md" />
            <div className="admin-skeleton h-14 rounded-md" />
            <div className="admin-skeleton h-14 rounded-md" />
          </div>
        ) : categories.length === 0 ? (
          <div className="admin-empty-panel mt-4 px-5 py-8">
            <Tags aria-hidden="true" className="text-white/35" size={26} />
            <p className="mt-4 text-sm font-medium text-white">
              Todavia no hay categorias.
            </p>
          </div>
        ) : (
          <>
            <div className="admin-table-wrap mt-4 hidden md:block">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Slug</th>
                    <th>Productos</th>
                    <th>Estado</th>
                    {canManage ? <th><span className="sr-only">Acciones</span></th> : null}
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => (
                    <tr key={category.id}>
                      <td className="font-medium text-white">{category.name}</td>
                      <td className="font-mono text-xs text-white/55">{category.slug}</td>
                      <td>{category.productCount}</td>
                      <td>
                        <span
                          className={`inline-flex min-h-7 items-center rounded-full border px-2.5 text-xs font-medium ${
                            category.isActive
                              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                              : "border-white/15 bg-white/[0.05] text-white/55"
                          }`}
                        >
                          {category.isActive ? "Activa" : "Inactiva"}
                        </span>
                      </td>
                      {canManage ? (
                        <td className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline-on-dark"
                              className="min-h-9 rounded-lg border-white/10 px-3 text-xs"
                              onClick={() => setEditing(category)}
                            >
                              Editar
                            </Button>
                            <Button
                              variant="outline-on-dark"
                              className="min-h-9 rounded-lg border-white/10 px-3 text-xs"
                              onClick={() => void toggleActive(category)}
                            >
                              {category.isActive ? "Desactivar" : "Activar"}
                            </Button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 grid gap-3 md:hidden">
              {categories.map((category) => (
                <article key={category.id} className="admin-panel p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">
                        {category.name}
                      </p>
                      <p className="mt-1 font-mono text-xs text-white/40">
                        {category.slug} · {category.productCount} productos
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${
                        category.isActive
                          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                          : "border-white/15 bg-white/[0.05] text-white/55"
                      }`}
                    >
                      {category.isActive ? "Activa" : "Inactiva"}
                    </span>
                  </div>
                  {canManage ? (
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <Button
                        variant="outline-on-dark"
                        className="rounded-lg border-white/10"
                        onClick={() => setEditing(category)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="outline-on-dark"
                        className="rounded-lg border-white/10"
                        onClick={() => void toggleActive(category)}
                      >
                        {category.isActive ? "Desactivar" : "Activar"}
                      </Button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {(createOpen || editing) && canManage ? (
        <CategoryFormDialog
          category={editing}
          onClose={() => {
            setCreateOpen(false);
            setEditing(null);
          }}
          onSaved={(message) => {
            setCreateOpen(false);
            setEditing(null);
            setStatusMessage(message);
            void loadCategories();
          }}
        />
      ) : null}
    </div>
  );
}
