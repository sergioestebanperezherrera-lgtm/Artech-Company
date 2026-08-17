import { cn } from "@/lib/utils/cn";

type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  tone?: "dark" | "light";
};

export function SectionHeader({
  eyebrow,
  title,
  description,
  tone = "dark",
}: SectionHeaderProps) {
  const isLight = tone === "light";

  return (
    <div className="mb-6 max-w-2xl">
      {eyebrow ? (
        <p
          className={cn(
            "mb-2 text-sm font-medium uppercase tracking-normal",
            isLight ? "text-text-secondary-on-light" : "text-text-secondary-on-dark",
          )}
        >
          {eyebrow}
        </p>
      ) : null}
      <h2
        className={cn(
          "text-2xl font-medium tracking-normal sm:text-3xl",
          isLight ? "text-text-primary-on-light" : "text-text-primary-on-dark",
        )}
      >
        {title}
      </h2>
      {description ? (
        <p
          className={cn(
            "mt-3 text-base leading-7",
            isLight ? "text-text-secondary-on-light" : "text-text-secondary-on-dark",
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
