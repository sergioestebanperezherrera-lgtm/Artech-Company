import { CreditCard, Headset, ShieldCheck, Truck } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const trustItems = [
  {
    title: "Envío",
    description: "Opciones preparadas para cobertura local.",
    icon: Truck,
  },
  {
    title: "Garantía",
    description: "Productos listos para políticas claras de respaldo.",
    icon: ShieldCheck,
  },
  {
    title: "Soporte",
    description: "Atención enfocada en resolver dudas de compra.",
    icon: Headset,
  },
  {
    title: "Pago seguro",
    description: "Flujo visual preparado para checkout futuro.",
    icon: CreditCard,
  },
];

type TrustSectionProps = {
  tone?: "dark" | "light";
};

export function TrustSection({ tone = "dark" }: TrustSectionProps) {
  const isLight = tone === "light";

  return (
    <div
      className={cn(
        "artech-liquid-glass artech-benefits-hotbar",
        isLight ? "artech-benefits-hotbar-light" : undefined,
      )}
      role="list"
      aria-label="Beneficios de compra"
    >
      {trustItems.map((item) => {
        const Icon = item.icon;

        return (
          <div
            key={item.title}
            className="artech-benefit-item"
            role="listitem"
          >
            <Icon
              className={cn(
                "artech-benefit-icon",
                isLight ? "text-text-primary-on-light" : "text-text-primary-on-dark",
              )}
              size={28}
              strokeWidth={1.5}
            />
            <span>
              <span className="artech-benefit-title">{item.title}</span>
              <span className="artech-benefit-copy">{item.description}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
