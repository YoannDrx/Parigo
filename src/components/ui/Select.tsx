"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

interface SelectProps<T extends string = string> {
  value: T;
  options: readonly SelectOption<T>[];
  onValueChange: (value: T) => void;
  ariaLabel: string;
  caption?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  variant?: "default" | "editorial";
}

export function Select<T extends string>({
  value,
  options,
  onValueChange,
  ariaLabel,
  caption,
  className,
  disabled = false,
  id,
  name,
  variant = "default",
}: SelectProps<T>) {
  const generatedId = useId();
  const listboxId = `${id || generatedId}-listbox`;
  const rootRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [open, setOpen] = useState(false);
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const selected = options[selectedIndex];

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => optionRefs.current[selectedIndex]?.focus());
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointerdown", close);
    };
  }, [open, selectedIndex]);

  const move = (direction: -1 | 1) => {
    let next = activeIndex;
    for (let attempt = 0; attempt < options.length; attempt += 1) {
      next = (next + direction + options.length) % options.length;
      if (!options[next]?.disabled) break;
    }
    setActiveIndex(next);
    optionRefs.current[next]?.focus();
  };

  const choose = (option: SelectOption<T>) => {
    if (option.disabled) return;
    onValueChange(option.value);
    setOpen(false);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      rootRef.current?.querySelector<HTMLButtonElement>("[role='combobox']")?.focus();
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setActiveIndex(selectedIndex);
        setOpen(true);
      }
      else move(event.key === "ArrowDown" ? 1 : -1);
    }
  };

  return (
    <div
      ref={rootRef}
      data-variant={variant}
      className={cn("parigo-select relative min-w-0", className)}
      onKeyDown={onKeyDown}
    >
      {name && <input type="hidden" name={name} value={value} />}
      <button
        id={id}
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-controls={listboxId}
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => {
          if (!open) setActiveIndex(selectedIndex);
          setOpen((current) => !current);
        }}
        className={cn(
          "parigo-select__trigger flex min-h-10 w-full items-center justify-between gap-4 border border-[var(--line)] bg-[var(--surface)] py-2 pl-3.5 pr-3.5 text-left text-xs font-semibold shadow-[var(--shadow-sm)] transition hover:border-[var(--line-strong)] focus-visible:border-[var(--signal-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/25 disabled:opacity-45",
          variant === "default" && "rounded-[var(--radius-md)]",
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          {caption && <span className="parigo-select__caption shrink-0">{caption}</span>}
          <span className="truncate">{selected?.label ?? value}</span>
        </span>
        <span className="flex h-6 w-5 shrink-0 items-center justify-end text-[var(--text-muted)]">
          <ChevronDown size={14} strokeWidth={1.6} className={cn("transition duration-300", open ? "rotate-180 text-[var(--signal-strong)]" : "opacity-70")} />
        </span>
      </button>

      {open && (
        <div id={listboxId} role="listbox" aria-label={ariaLabel} className={cn("parigo-select__listbox absolute right-0 top-[calc(100%+.45rem)] z-[70] max-h-72 min-w-full overflow-y-auto border border-[var(--line-strong)] bg-[var(--surface)] p-1.5 shadow-[0_22px_60px_rgba(15,22,16,.18)]", variant === "default" && "rounded-[var(--radius-md)]")}>
          {options.map((option, index) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                ref={(node) => { optionRefs.current[index] = node; }}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={option.disabled}
                onFocus={() => setActiveIndex(index)}
                onClick={() => choose(option)}
                className={cn(
                  "parigo-select__option flex min-h-10 w-full items-center justify-between gap-5 whitespace-nowrap px-3 text-left text-xs transition focus-visible:outline-none",
                  variant === "default" && "rounded-md",
                  activeIndex === index && "bg-[var(--surface-soft)]",
                  isSelected && "font-semibold text-[var(--signal-strong)]",
                  option.disabled && "opacity-35",
                )}
              >
                <span>{option.label}</span>
                {isSelected && <Check size={14} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
