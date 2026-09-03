import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string | undefined;
  title: string;
  description?: string | undefined;
  actions?: ReactNode | undefined;
}) {
  return (
    <div className="border-b bg-deep text-deep-foreground">
      <div className="grid-backdrop">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-10 sm:px-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            {eyebrow ? (
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{title}</h1>
            {description ? (
              <p className="mt-3 text-sm leading-relaxed text-deep-foreground/75 sm:text-base">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      </div>
    </div>
  );
}
