import { useEffect, useRef, useState, type ReactNode } from "react";

export function QuantityRuler({
  value,
  onChange,
  grams,
  unitControl,
}: {
  value: number;
  onChange: (v: number) => void;
  grams: boolean;
  unitControl: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [width, setWidth] = useState(300);
  const max = grams ? 5000 : 20.9,
    step = grams ? 1 : 0.1,
    count = Math.round(max / step);
  const clamp = (v: number) =>
    Math.round(Math.min(max, Math.max(0, v)) * 10) / 10;
  useEffect(() => {
    const node = ref.current!;
    const observer = new ResizeObserver(() => setWidth(node.clientWidth));
    observer.observe(node);
    return () => {
      observer.disconnect();
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  useEffect(() => {
    if (ref.current)
      ref.current.scrollLeft = (Math.min(max, Math.max(0, value)) / step) * 8;
  }, [value, width, max, step]);
  const interval = grams ? 10 : 1,
    labels = Array.from(
      { length: Math.floor(max / interval) + 1 },
      (_, i) => i * interval,
    );
  return (
    <div className="quantity-ruler-picker">
      <div className="quantity-value-row">
        <input
          aria-label="食用数量"
          type="number"
          inputMode="decimal"
          min={grams ? 1 : 0.1}
          max={max}
          step={step}
          value={value || ""}
          onChange={(e) => onChange(clamp(Number(e.target.value)))}
        />
        {unitControl}
      </div>
      <div className="quantity-ruler-wrap">
        <span className="quantity-ruler-pointer" aria-hidden="true" />
        <div
          className="quantity-ruler"
          ref={ref}
          role="slider"
          aria-label="食用份量刻度"
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuenow={value}
          tabIndex={0}
          onKeyDown={(e) => {
            if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
              e.preventDefault();
              onChange(
                clamp(
                  e.key === "Home"
                    ? 0
                    : e.key === "End"
                      ? max
                      : value + (e.key === "ArrowRight" ? step : -step),
                ),
              );
            }
          }}
          onScroll={() => {
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => {
              if (ref.current) {
                const index = Math.min(
                  count,
                  Math.max(0, Math.round(ref.current.scrollLeft / 8)),
                );
                onChange(clamp(index * step));
                ref.current.scrollLeft = index * 8;
              }
            }, 100);
          }}
        >
          <div
            className="quantity-ruler-track"
            style={{ width: count * 8 + width }}
          >
            <div
              className="quantity-ruler-ticks"
              style={{ left: width / 2, width: count * 8 }}
            />
            {labels.map((n) => (
              <span
                key={n}
                className="quantity-ruler-label"
                style={{ left: width / 2 + (n / step) * 8 }}
              >
                {n}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="quantity-presets">
        {(grams ? [50, 100, 150, 200] : [0.5, 1, 1.5, 2]).map((n) => (
          <button type="button" key={n} onClick={() => onChange(n)}>
            {n}
            {grams ? "g" : ""}
          </button>
        ))}
      </div>
    </div>
  );
}
