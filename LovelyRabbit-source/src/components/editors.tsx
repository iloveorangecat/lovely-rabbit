import { ArrowUpRight, Flower2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { weekNames } from "../constants";
import {
  dateKey,
  rewardNames,
  thresholds,
  uid,
  type Reward,
  type Task,
} from "../model";
export function Onboarding({
  onSave,
  busy,
}: {
  onSave: (names: string[]) => void;
  busy: boolean;
}) {
  const [count, setCount] = useState(6);
  const [names, setNames] = useState([...rewardNames]);
  return (
    <>
      <div className="onboard-mark">
        <Flower2 size={42} />
      </div>
      <p className="eyebrow text-center">A LITTLE WISH, A LOVELY BEGINNING</p>
      <p className="muted text-center">
        让每一段成长，都有一个值得期待的心愿。
        <br />
        以后也可以在奖励商店里随时修改。
      </p>
      <label>
        我的成长阶段数
        <select
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
        >
          {thresholds.map((_, i) => (
            <option key={i} value={i + 1}>
              {i + 1} 个阶段
            </option>
          ))}
        </select>
      </label>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(names.slice(0, count));
        }}
      >
        <div className="wish-inputs">
          {thresholds.slice(0, count).map((cost, i) => (
            <label className="wish-input" key={cost}>
              <span>
                {String(i + 1).padStart(2, "0")}
                <small>{cost} 积分</small>
              </span>
              <input
                aria-label={`心愿${i + 1}`}
                required
                maxLength={80}
                value={names[i]}
                onChange={(e) =>
                  setNames(names.map((n, j) => (j === i ? e.target.value : n)))
                }
              />
            </label>
          ))}
        </div>
        <button className="primary wide" disabled={busy}>
          开启兔兔要减肥 <ArrowUpRight size={18} />
        </button>
      </form>
    </>
  );
}
export function TaskForm({
  task,
  onSave,
  busy,
}: {
  task?: Task;
  onSave: (t: Task) => void;
  busy: boolean;
}) {
  const [days, setDays] = useState(task?.days ?? [0, 1, 2, 3, 4, 5, 6]);
  return (
    <form
      onSubmit={(e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        onSave({
          id: task?.id ?? uid(),
          name: String(f.get("name")).trim(),
          xp: null,
          days,
          training: task?.training ?? false,
          created: task?.created ?? dateKey(),
          archived: false,
        });
      }}
    >
      <label>
        任务名称
        <input
          name="name"
          defaultValue={task?.name}
          maxLength={80}
          required
          placeholder="例如：出门散步 20 分钟"
        />
      </label>
      <label>执行频率</label>
      <div className="week-picker">
        {weekNames.map((n, i) => (
          <button
            aria-pressed={days.includes(i)}
            className={days.includes(i) ? "selected" : ""}
            type="button"
            key={n}
            onClick={() =>
              setDays(
                days.includes(i) ? days.filter((d) => d !== i) : [...days, i],
              )
            }
          >
            周{n}
          </button>
        ))}
      </div>
      <p className="task-points-policy">每次随机获得 2–6 积分</p>
      <button disabled={busy || !days.length} className="primary wide">
        保存任务
      </button>
    </form>
  );
}
export function RewardForm({
  reward,
  onSave,
  busy,
}: {
  reward?: Reward;
  onSave: (r: Reward) => void;
  busy: boolean;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        onSave({
          id: reward?.id ?? uid(),
          name: String(f.get("name")).trim(),
          cost: Number(f.get("cost")),
          icon: "gift",
          image: reward?.image ?? "",
          stage: f.get("stage") === "on",
        });
      }}
    >
      <label>
        心愿名称
        <input
          name="name"
          required
          maxLength={80}
          defaultValue={reward?.name}
          placeholder="为自己准备一份喜欢的礼物"
        />
      </label>
      <label>
        所需积分
        <input
          name="cost"
          type="number"
          min={1}
          max={100000}
          step={1}
          required
          defaultValue={reward?.cost ?? 66}
        />
      </label>
      <label className="check-label">
        <input
          name="stage"
          type="checkbox"
          defaultChecked={reward?.stage ?? true}
        />
        作为一个成长阶段的终点
      </label>
      <p className="muted">
        阶段按积分从小到大排列。累计 积分
        达标会自动进入下一阶段；心愿可稍后兑换。阶段积分不能重复。
      </p>
      <button className="primary wide" disabled={busy}>
        保存心愿
      </button>
    </form>
  );
}
