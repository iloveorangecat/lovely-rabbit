import { useEffect, useRef } from "react";
export function DigitWheel({
  values,
  value,
  onChange,
  label,
}: {
  values: number[];
  value: number;
  onChange: (n: number) => void;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (ref.current)
      ref.current.scrollTop = Math.max(0, values.indexOf(value)) * 40;
  }, [value, values]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return (
    <div
      className="digit-wheel"
      ref={ref}
      role="spinbutton"
      aria-label={label}
      aria-valuemin={values[0]}
      aria-valuemax={values.at(-1)}
      aria-valuenow={value}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          e.preventDefault();
          const i = values.indexOf(value) + (e.key === "ArrowUp" ? -1 : 1);
          onChange(values[Math.min(values.length - 1, Math.max(0, i))]);
        }
      }}
      onScroll={() => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          if (ref.current) {
            const i = Math.min(
              values.length - 1,
              Math.max(0, Math.round(ref.current.scrollTop / 40)),
            );
            onChange(values[i]);
          }
        }, 140);
      }}
    >
      {values.map((n) => (
        <div
          key={n}
          className={n === value ? "wheel-item selected" : "wheel-item"}
          aria-hidden="true"
          onClick={() => onChange(n)}
        >
          {n}
        </div>
      ))}
    </div>
  );
}
const digits = Array.from({ length: 10 }, (_, i) => i),
  portions = Array.from({ length: 21 }, (_, i) => i);
export function NumberWheel({
  value,
  onChange,
  grams,
}: {
  value: number;
  onChange: (n: number) => void;
  grams: boolean;
}) {
  const whole = Math.floor(value),
    decimal = Math.round((value - whole) * 10);
  return (
    <div className="quantity-picker">
      <div className="wheel-frame">
        <div className="wheel-selection" aria-hidden="true" />
        {grams ? (
          <>
            {[1000, 100, 10, 1].map((place, i) => (
              <DigitWheel
                key={place}
                values={digits}
                value={Math.floor(whole / place) % 10}
                label={`数量${["千", "百", "十", "个"][i]}位`}
                onChange={(n) =>
                  onChange(
                    Math.min(
                      5000,
                      whole -
                        (Math.floor(whole / place) % 10) * place +
                        n * place,
                    ),
                  )
                }
              />
            ))}
          </>
        ) : (
          <>
            <DigitWheel
              values={portions}
              value={Math.min(20, whole)}
              label="份数整数"
              onChange={(n) => onChange(n + decimal / 10)}
            />
            <span className="wheel-decimal">.</span>
            <DigitWheel
              values={digits}
              value={decimal}
              label="份数小数"
              onChange={(n) => onChange(Math.min(20, whole) + n / 10)}
            />
          </>
        )}
      </div>
      <label className="quantity-direct">
        直接输入数量
        <input
          aria-label="食用数量"
          type="number"
          inputMode="decimal"
          min={grams ? 1 : 0.1}
          max={grams ? 5000 : 20.9}
          step={grams ? 1 : 0.1}
          value={value || ""}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </label>
    </div>
  );
}
