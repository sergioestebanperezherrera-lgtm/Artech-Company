import { cn } from "@/lib/utils/cn";

export function EmployeeStatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-full border px-2.5 text-xs font-medium",
        active
          ? "border-white/20 bg-white/[0.08] text-white"
          : "border-white/[0.08] bg-black/30 text-white/45",
      )}
    >
      {active ? "Activo" : "Inactivo"}
    </span>
  );
}
