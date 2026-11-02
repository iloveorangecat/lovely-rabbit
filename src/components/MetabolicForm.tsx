import { useState } from "react";
import { metabolicSchema, type MetabolicProfile } from "../nutrition";
export function MetabolicForm({
  initial,
  onSave,
  targetKg = 50,
}: {
  initial?: MetabolicProfile | null;
  onSave: (v: MetabolicProfile, targetKg: number) => Promise<boolean>;
  targetKg?: number;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      className="metabolic-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        const f = new FormData(e.currentTarget);
        const result = metabolicSchema.safeParse({
          sex: f.get("sex"),
          age: Number(f.get("age")),
          heightCm: Number(f.get("height")),
          weightKg: Number(f.get("weight")),
          activity: f.get("activity"),
        });
        const target = Number(f.get("target"));
        if (
          !result.success ||
          !Number.isFinite(target) ||
          target < 20 ||
          target > 300
        ) {
          setError(
            "请填写完整的成人资料：年龄 18–100 岁，身高 100–230 cm，体重 20–300 kg",
          );
          return;
        }
        setError("");
        setBusy(true);
        try {
          await onSave(result.data, target);
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="muted">
        估算基础代谢需要年龄、公式性别参数、身高和体重。结果不是每日进食目标。
      </p>
      <div className="form-row">
        <label>
          公式性别参数
          <select name="sex" defaultValue={initial?.sex ?? "female"}>
            <option value="female">女性</option>
            <option value="male">男性</option>
          </select>
        </label>
        <label>
          年龄
          <input
            name="age"
            aria-label="年龄"
            type="number"
            required
            min="18"
            max="100"
            defaultValue={initial?.age}
          />
        </label>
      </div>
      <div className="form-row metabolic-size">
        <label>
          身高（cm）
          <input
            name="height"
            aria-label="身高"
            type="number"
            required
            min="100"
            max="230"
            step=".1"
            defaultValue={initial?.heightCm ?? 160}
          />
        </label>
        <label>
          体重（kg）
          <input
            name="weight"
            aria-label="代谢体重"
            type="number"
            required
            min="20"
            max="300"
            step=".1"
            defaultValue={initial?.weightKg ?? 50}
          />
        </label>
      </div>
      <label>
        目标体重（kg）
        <input
          name="target"
          aria-label="代谢目标体重"
          type="number"
          min="20"
          max="300"
          step=".1"
          required
          defaultValue={targetKg}
        />
      </label>
      <label>
        日常活动情况
        <select name="activity" defaultValue={initial?.activity ?? "sedentary"}>
          <option value="sedentary">久坐，日常走动较少</option>
          <option value="light">轻度活动，偶尔散步</option>
          <option value="moderate">中等活动，规律运动</option>
          <option value="active">较多活动或体力工作</option>
        </select>
      </label>
      {error && (
        <p role="alert" className="danger-text">
          {error}
        </p>
      )}
      <button className="primary wide" disabled={busy}>
        {busy ? "保存中…" : "保存"}
      </button>
    </form>
  );
}
