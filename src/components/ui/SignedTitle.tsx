import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function stripTerminalTitleMark(value: string): string {
  return value.replace(/[.!?…]+\s*$/u, "");
}

interface SignedTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: "h1" | "h2" | "h3";
  children: ReactNode;
  variant?: "display" | "page" | "detail" | "section" | "compact";
}

export function SignedTitle({
  as: Heading = "h1",
  children,
  className,
  variant,
  ...props
}: SignedTitleProps) {
  const content = typeof children === "string" ? stripTerminalTitleMark(children) : null;
  const lastSpace = content?.lastIndexOf(" ") ?? -1;
  const prefix = content && lastSpace >= 0 ? content.slice(0, lastSpace + 1) : "";
  const tail = content ? content.slice(lastSpace + 1) : null;

  return (
    <Heading
      className={cn("parigo-signed-title", variant && `type-${variant}`, className)}
      data-title-variant={variant}
      {...props}
    >
      {tail ? (
        <>
          {prefix}
          <span className="parigo-signed-title__tail">
            {tail}
            <span className="parigo-title-signature" aria-hidden="true" />
          </span>
        </>
      ) : (
        <>
          {children}
          <span className="parigo-title-signature" aria-hidden="true" />
        </>
      )}
    </Heading>
  );
}
