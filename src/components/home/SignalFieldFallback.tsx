interface SignalFieldFallbackProps {
  active: boolean;
  staticMode: boolean;
}

const wavePath = "M-360 210 C-280 48 -200 48 -120 210 S40 372 120 210 S280 48 360 210 S520 372 600 210 S760 48 840 210 S1000 372 1080 210 S1240 48 1320 210 S1480 372 1560 210";

export function SignalFieldFallback({ active, staticMode }: SignalFieldFallbackProps) {
  return (
    <svg
      viewBox="0 0 1200 420"
      preserveAspectRatio="none"
      className="signal-field-fallback absolute inset-0 h-full w-full"
      data-active={active}
      data-static={staticMode}
      aria-hidden="true"
    >
      <g className="signal-field-fallback__wave signal-field-fallback__wave--primary">
        <path d={wavePath} />
      </g>
      <g className="signal-field-fallback__wave signal-field-fallback__wave--soft">
        <path d={wavePath} transform="translate(0 22) scale(1 .72)" />
      </g>
      <g className="signal-field-fallback__wave signal-field-fallback__wave--muted">
        <path d={wavePath} transform="translate(0 -28) scale(1 1.18)" />
      </g>
    </svg>
  );
}
