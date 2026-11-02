import { useEffect, useState } from "react";
import {
  activityName,
  activityLabels,
  loadActivities,
  type Activity,
} from "../exercises";
import {
  exerciseCalories,
  type ExerciseEntry,
  type CustomExercise,
} from "../nutrition";
import { CustomExerciseRecorder } from "./CustomExerciseRecorder";
import { uid } from "../model";
import { DigitWheel } from "./NumberWheel";
const digits = Array.from({ length: 10 }, (_, i) => i);
export function ExerciseSheet({
  date,
  weightKg,
  age,
  entry,
  onSave,
  customExercises,
  onRemember,
}: {
  date: string;
  weightKg?: number;
  age?: number;
  entry?: ExerciseEntry;
  onSave: (entry: ExerciseEntry) => Promise<boolean>;
  customExercises: CustomExercise[];
  onRemember: (v: CustomExercise) => Promise<CustomExercise | null>;
}) {
  const [items, setItems] = useState<Activity[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState("常用运动");
  const [activity, setActivity] = useState<Activity | null>(
    entry?.snapshot
      ? {
          code: entry.snapshot.code,
          met: entry.snapshot.met,
          description: entry.snapshot.description,
          category: "已记录运动",
          source: entry.source,
          estimatedMET: entry.snapshot.estimatedMET,
        }
      : null,
  );
  const [minutes, setMinutes] = useState(entry?.minutes ?? 30),
    [weight, setWeight] = useState(entry?.snapshot?.weightKg ?? weightKg ?? 0),
    [userAge, setAge] = useState(entry?.snapshot?.age ?? age ?? 0),
    [saving, setSaving] = useState(false);
  const [customChoice, setCustomChoice] = useState<
    CustomExercise | null | undefined
  >(entry?.custom);
  function load() {
    setLoading(true);
    setError("");
    loadActivities()
      .then(setItems)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }
  useEffect(() => {
    load();
  }, []);
  const valid =
    userAge >= 19 &&
    userAge <= 59 &&
    weight >= 20 &&
    weight <= 300 &&
    minutes >= 1 &&
    minutes <= 1440 &&
    Number.isInteger(minutes);
  const filtered = items.filter(
    (a) =>
      (category === "全部活动" || category === "常用运动"
        ? category !== "常用运动" || !!activityLabels[a.code]
        : a.category === category) &&
      `${activityName(a)} ${a.description} ${a.category} ${a.code}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const customMatches = customExercises.filter(
    (v) =>
      ["常用运动", "全部活动", "我的运动"].includes(category) &&
      v.name
        .normalize("NFKC")
        .toLowerCase()
        .includes(query.normalize("NFKC").trim().toLowerCase()),
  );
  if (customChoice !== undefined)
    return (
      <CustomExerciseRecorder
        definition={customChoice ?? undefined}
        entry={entry}
        date={date}
        onBack={() => setCustomChoice(undefined)}
        onRemember={onRemember}
        onSave={onSave}
      />
    );
  return (
    <div className="exercise-sheet-content">
      <p className="muted">{date} · 2024 官方成人活动表（19–59 岁）</p>
      {!activity ? (
        <>
          <label>
            搜索运动
            <input
              aria-label="搜索运动"
              placeholder="快走、瑜伽、running…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (e.target.value) setCategory("全部活动");
              }}
            />
          </label>
          <label>
            活动分类
            <select
              aria-label="活动分类"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {[
                "常用运动",
                "全部活动",
                "我的运动",
                ...new Set(items.map((a) => a.category)),
              ].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="text-button"
            onClick={() => setCustomChoice(null)}
          >
            找不到？添加自定义运动
          </button>
          {loading && <p role="status">正在加载运动库…</p>}
          {error && (
            <p role="alert">
              {error}
              <button type="button" onClick={load}>
                重试
              </button>
            </p>
          )}
          <div className="exercise-results">
            {customMatches.map((v) => (
              <button
                type="button"
                className="food-result custom-exercise-result"
                key={v.id}
                onClick={() => setCustomChoice(v)}
              >
                <strong>{v.name}</strong>
                <small>
                  我的运动 · {v.minutes} 分钟 / {v.kcal} 千卡
                </small>
              </button>
            ))}
            {filtered.slice(0, 80).map((a) => (
              <button
                type="button"
                className="food-result"
                key={a.code}
                onClick={() => {
                  setActivity(a);
                  setError("");
                }}
              >
                <strong>{activityName(a)}</strong>
                <small>
                  {a.met} MET · {a.category}
                </small>
              </button>
            ))}
          </div>
          {!loading && !filtered.length && !customMatches.length && (
            <p>没有找到，请尝试其他名称或英文关键词。</p>
          )}
          {filtered.length > 80 && (
            <p className="muted">
              共 {filtered.length} 项，请搜索或选择分类缩小范围。
            </p>
          )}
        </>
      ) : (
        <>
          <button
            type="button"
            className="text-button"
            onClick={() => setActivity(null)}
          >
            重新选择运动
          </button>
          <h3>{activityName(activity)}</h3>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!valid || saving) return;
              setSaving(true);
              setError("");
              try {
                await onSave({
                  id: entry?.id ?? uid(),
                  date,
                  name: activityName(activity),
                  minutes,
                  kcal: exerciseCalories(activity.met, weight, minutes),
                  source: activity.source,
                  snapshot: {
                    edition: "2024 Adult",
                    code: activity.code,
                    met: activity.met,
                    weightKg: weight,
                    age: userAge,
                    description: activity.description,
                    estimatedMET: activity.estimatedMET,
                    netKcal: exerciseCalories(
                      Math.max(0, activity.met - 1),
                      weight,
                      minutes,
                    ),
                  },
                });
              } catch (e) {
                setError(String(e));
              } finally {
                setSaving(false);
              }
            }}
          >
            <label>时长（分钟）</label>
            <div className="wheel-frame">
              <div className="wheel-selection" aria-hidden="true" />
              {[1000, 100, 10, 1].map((p, i) => (
                <DigitWheel
                  key={p}
                  values={digits}
                  value={Math.floor(minutes / p) % 10}
                  label={`运动时长${["千", "百", "十", "个"][i]}位`}
                  onChange={(n) =>
                    setMinutes(
                      Math.min(
                        1440,
                        minutes - (Math.floor(minutes / p) % 10) * p + n * p,
                      ),
                    )
                  }
                />
              ))}
            </div>
            <label>
              直接输入时长
              <input
                aria-label="运动分钟"
                type="number"
                inputMode="numeric"
                min="1"
                max="1440"
                step="1"
                value={minutes || ""}
                onChange={(e) => setMinutes(Number(e.target.value))}
                required
              />
            </label>
            <div className="exercise-fields">
              <label>
                运动时体重（kg）
                <input
                  aria-label="运动体重"
                  type="number"
                  inputMode="decimal"
                  min="20"
                  max="300"
                  step="0.1"
                  value={weight || ""}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  required
                />
              </label>
              <label>
                年龄
                <input
                  aria-label="运动年龄"
                  type="number"
                  inputMode="numeric"
                  min="19"
                  max="59"
                  value={userAge || ""}
                  onChange={(e) => setAge(Number(e.target.value))}
                  required
                />
              </label>
            </div>
            <div className="exercise-estimate" role="status">
              预计总消耗{" "}
              <strong>
                {valid
                  ? Math.round(exerciseCalories(activity.met, weight, minutes))
                  : "—"}{" "}
                千卡
              </strong>
            </div>
            <details>
              <summary>估算方式与数据来源</summary>
              <p>
                总消耗 = {activity.met} MET × 体重 × 分钟 ÷
                60，包含这段时间的静息消耗。额外活动消耗约{" "}
                {valid
                  ? Math.round(
                      exerciseCalories(
                        Math.max(0, activity.met - 1),
                        weight,
                        minutes,
                      ),
                    )
                  : "—"}{" "}
                千卡。均为群体参考估算，不是个人实测；不自动计入首页热量差额或任务积分。
              </p>
              <p>{activity.description}</p>
              <p>
                编号 {activity.code} · MET 来源为
                {activity.estimatedMET ? "官方估计值" : "已发表文献"}
                。中文常用名称为应用提供，完整原文如上。
              </p>
              <a href={activity.source} target="_blank" rel="noreferrer">
                2024 Compendium 官方原始条目
              </a>
            </details>
            {!valid && (
              <p>
                请填写 19–59 岁、20–300 kg 和 1–1440
                分钟。本表不用于其他年龄段。
              </p>
            )}
            {error && <p role="alert">{error}</p>}
            <button
              className="primary"
              type="submit"
              disabled={!valid || saving}
            >
              {saving ? "保存中…" : entry ? "保存运动修改" : "添加运动记录"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
