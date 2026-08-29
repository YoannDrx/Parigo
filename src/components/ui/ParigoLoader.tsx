import { cn } from "@/lib/utils";

type ParigoLoaderSize = "icon" | "compact" | "default" | "page";

export function ParigoLoader({
  label = "Loading",
  size = "default",
  className,
}: {
  label?: string;
  size?: ParigoLoaderSize;
  className?: string;
}) {
  return (
    <span
      role="status"
      aria-label={label}
      data-testid="parigo-loader"
      className={cn("parigo-loader", `parigo-loader--${size}`, className)}
    >
      <span aria-hidden="true" className="parigo-loader__frame">
        {size !== "icon" ? <span className="parigo-loader__word">Loading</span> : null}
        <span className="parigo-loader__dots">
          <span />
          <span />
          <span />
        </span>
      </span>
    </span>
  );
}
