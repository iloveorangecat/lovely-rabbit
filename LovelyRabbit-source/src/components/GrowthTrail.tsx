import { Check } from "lucide-react";
import { totals, shiftDate, type State } from "../model";
import { Section, Empty, PageTitle } from "./common";
import { wishAxisPercent } from "../wish-progress";
export function WishAxis({ state: s }: { state: State }) {
  const xp = totals(s).lifetimeXP;
  const list = [...s.rewards].sort((a, b) => a.cost - b.cost);
  const max = list.at(-1)?.cost ?? 1;
  const next = list.find((r) => r.cost > xp);
  return (
    <section className="panel wish-axis-panel">
      <Section title="心愿进度" />
      <div className="axis-summary">
        <strong>{xp} 积分</strong>
        <span>
          {next ? `下一心愿还差 ${next.cost - xp} 积分` : "所有心愿已达标"}
        </span>
      </div>
      <div
        className="wish-axis-horizontal"
        role="progressbar"
        aria-label="心愿总进度"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.min(xp, max)}
      >
        <div
          className="axis-row"
          style={{ width: `${Math.max(6, list.length) * 48}px` }}
        >
          <div className="horizontal-rail">
            <div
              style={{
                width: `${wishAxisPercent(
                  list.map((r) => r.cost),
                  xp,
                )}%`,
              }}
            />
          </div>
          {list.map((r, i) => (
            <div
              className={`axis-node ${xp >= r.cost ? "reached" : ""}`}
              key={r.id}
            >
              <span className="axis-dot">
                {xp >= r.cost && <Check size={11} />}
              </span>
              <span>心愿{i + 1}</span>
              <small>{r.cost} 积分</small>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
export function GrowthTrail({
  state: s,
  today,
  onWeight,
}: {
  state: State;
  today: string;
  onWeight: () => void;
}) {
  const weekday = new Date(`${today}T12:00:00`).getDay(),
    start = shiftDate(today, -((weekday + 6) % 7));
  const all = s.plans.flatMap((p) =>
    p.items.filter((i) => i.done).map((i) => ({ ...i, date: p.date })),
  );
  const expected = s.plans.reduce((n, p) => n + p.items.length, 0);
  const weeks = Array.from({ length: 4 }, (_, i) => {
    const from = shiftDate(start, (i - 3) * 7),
      to = shiftDate(from, 6);
    return {
      label: i === 3 ? "本周" : from.slice(5),
      count: all.filter((i) => i.date >= from && i.date <= to).length,
    };
  });
  const max = Math.max(1, ...weeks.map((w) => w.count));
  const weights = [...s.weights]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-12);
  const minW = Math.min(...weights.map((w) => w.kg)),
    maxW = Math.max(...weights.map((w) => w.kg));
  const x = (i: number) => 20 + (i / Math.max(1, weights.length - 1)) * 280,
    y = (kg: number) => 100 - ((kg - minW) / Math.max(1, maxW - minW)) * 70;
  const unit = s.profile.unit,
    multiplier = unit === "斤" ? 2 : 1;
  return (
    <>
      <PageTitle eyebrow="MY GROWTH JOURNEY" title="成长轨迹" text="" />
      <div className="stats-grid">
        {[
          [all.filter((i) => i.date >= start).length, "本周完成任务", "次"],
          [
            all
              .filter((i) => i.date.startsWith(today.slice(0, 7)))
              .reduce((n, i) => n + i.xp, 0),
            "本月获得积分",
            "积分",
          ],
          [
            expected ? Math.round((all.length / expected) * 100) : 0,
            "习惯完成率",
            "%",
          ],
        ].map(([value, label, unit]) => (
          <div className="stat-card" key={label}>
            <span>{label}</span>
            <strong>
              {value}
              <small>{unit}</small>
            </strong>
          </div>
        ))}
      </div>
      <Section title="最近四周" />
      <section className="panel">
        <div
          className="bar-chart"
          role="img"
          aria-label={weeks.map((w) => `${w.label} ${w.count}次`).join("，")}
        >
          {weeks.map((w) => (
            <div key={w.label}>
              <strong>{w.count}</strong>
              <div className="bar-track">
                <span
                  style={{ height: `${Math.max(3, (w.count / max) * 100)}%` }}
                />
              </div>
              <small>{w.label}</small>
            </div>
          ))}
        </div>
      </section>
      <Section
        title="体重趋势"
        action={
          <button className="text-button" onClick={onWeight}>
            记录体重
          </button>
        }
      />
      <section className="panel">
        {weights.length ? (
          <>
            <svg
              className="weight-chart"
              viewBox="0 0 320 135"
              role="img"
              aria-label="最近十二次体重记录趋势"
            >
              <line x1="15" y1="110" x2="305" y2="110" stroke="var(--line)" />
              <polyline
                points={weights.map((w, i) => `${x(i)},${y(w.kg)}`).join(" ")}
                fill="none"
                stroke="var(--rose)"
                strokeWidth="2.5"
              />
              {weights.map((w, i) => (
                <g key={w.date}>
                  <circle cx={x(i)} cy={y(w.kg)} r="4" fill="var(--rose)" />
                  <title>
                    {w.date} {(w.kg * multiplier).toFixed(1)} {unit}
                  </title>
                </g>
              ))}
            </svg>
            {weights
              .slice()
              .reverse()
              .map((w) => (
                <div className="weight-row" key={w.date}>
                  <span>{w.date}</span>
                  <strong>
                    {(w.kg * multiplier).toFixed(1)} {unit}
                  </strong>
                </div>
              ))}
          </>
        ) : (
          <Empty>记录体重后，这里会显示趋势。</Empty>
        )}
      </section>
    </>
  );
}
