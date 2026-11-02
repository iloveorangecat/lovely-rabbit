import { useState } from "react";
import {
  customExerciseSchema,
  customExerciseCalories,
  type CustomExercise,
  type ExerciseEntry,
} from "../nutrition";
import { uid } from "../model";
export function CustomExerciseRecorder({
  definition,
  entry,
  date,
  onBack,
  onRemember,
  onSave,
}: {
  definition?: CustomExercise;
  entry?: ExerciseEntry;
  date: string;
  onBack: () => void;
  onRemember: (v: CustomExercise) => Promise<CustomExercise | null>;
  onSave: (v: ExerciseEntry) => Promise<boolean>;
}) {
  const [saved, setSaved] = useState(definition),
    [minutes, setMinutes] = useState(
      entry?.minutes ?? definition?.minutes ?? 30,
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const kcal = saved ? customExerciseCalories(saved, minutes) : 0;
  return (
    <div className="exercise-sheet-content">
      <button type="button" className="text-button" onClick={onBack}>
        返回运动选择
      </button>
      {saved ? (
        <>
          <h3>{saved.name}</h3>
          <p className="muted">
            我的运动 · 参考 {saved.minutes} 分钟 / {saved.kcal} 千卡
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (busy || minutes <= 0 || kcal > 100000) return;
              setBusy(true);
              try {
                await onSave({
                  id: entry?.id ?? uid(),
                  date,
                  name: saved.name,
                  minutes,
                  kcal,
                  source: saved.source,
                  custom: { ...saved },
                });
              } catch (e) {
                setError(String(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              本次运动时长（分钟）
              <input
                aria-label="自定义运动分钟"
                type="number"
                min="1"
                max="1440"
                step="1"
                value={minutes || ""}
                required
                onChange={(e) => setMinutes(Number(e.target.value))}
              />
            </label>
            <div className="exercise-estimate">
              本次消耗{" "}
              <strong>{Number.isFinite(kcal) ? kcal : "—"} 千卡</strong>
            </div>
            <p className="muted">
              按你保存的参考时长与热量换算，不使用官方
              MET，也不会随体重自动调整。
            </p>
            {error && <p role="alert">{error}</p>}
            <button
              className="primary"
              disabled={busy || minutes < 1 || minutes > 1440 || kcal > 100000}
            >
              {busy ? "保存中…" : entry ? "保存运动修改" : "添加运动记录"}
            </button>
          </form>
        </>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            const f = new FormData(e.currentTarget);
            const parsed = customExerciseSchema.safeParse({
              id: uid(),
              name: f.get("name"),
              minutes: Number(f.get("minutes")),
              kcal: Number(f.get("kcal")),
              source: "用户填写的参考热量",
            });
            if (!parsed.success) {
              setError("请检查名称、时长和热量");
              return;
            }
            setBusy(true);
            try {
              const stored = await onRemember(parsed.data);
              if (stored) {
                setSaved(stored);
                setMinutes(stored.minutes);
                setError("");
              }
            } catch (e) {
              setError(String(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          <h3>添加我的运动</h3>
          <label>
            运动名称
            <input
              aria-label="自定义运动名称"
              name="name"
              required
              maxLength={120}
            />
          </label>
          <label>
            参考时长（分钟）
            <input
              aria-label="参考运动分钟"
              name="minutes"
              type="number"
              min="1"
              max="1440"
              step="1"
              defaultValue="30"
              required
            />
          </label>
          <label>
            参考消耗（千卡）
            <input
              aria-label="参考运动热量"
              name="kcal"
              type="number"
              min="0"
              max="100000"
              step=".1"
              required
            />
          </label>
          <p className="muted">
            填写设备、课程或自己的参考热量，保存后可反复选用。
          </p>
          {error && <p role="alert">{error}</p>}
          <button className="primary" disabled={busy}>
            {busy ? "保存中…" : "保存到我的运动库"}
          </button>
        </form>
      )}
    </div>
  );
}
