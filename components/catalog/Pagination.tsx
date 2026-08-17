"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { IconCircleButton } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <nav
      aria-label="Paginación de catálogo"
      className="mt-8 flex items-center justify-center gap-2"
    >
      <IconCircleButton
        aria-label="Página anterior"
        icon={<ChevronLeft strokeWidth={1.5} />}
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
      />
      {pages.map((page) => (
        <button
          key={page}
          type="button"
          aria-current={currentPage === page ? "page" : undefined}
          onClick={() => onPageChange(page)}
          className={cn(
            "size-8 rounded-full border text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4",
            currentPage === page
              ? "border-text-primary-on-dark bg-btn-primary-on-dark-bg text-btn-primary-on-dark-text"
              : "border-border-on-dark text-text-primary-on-dark hover:border-text-secondary-on-dark",
          )}
        >
          {page}
        </button>
      ))}
      <IconCircleButton
        aria-label="Página siguiente"
        icon={<ChevronRight strokeWidth={1.5} />}
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
      />
    </nav>
  );
}
