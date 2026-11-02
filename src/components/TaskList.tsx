import {
  Check,
  Droplets,
  Dumbbell,
  Footprints,
  Moon,
  Utensils,
} from "lucide-react";
import type { Plan } from "../model";
import { Empty } from "./common";
import { BalletBow } from "./BalletBow";
import { BalletLace, BalletLacing } from "./BalletTrim";
export function TaskList({
  plan,
  editable,
  busy,
  onToggle,
  completedOnly = false,
}: {
  plan?: Plan;
  completedOnly?: boolean;
  editable: boolean;
  busy: boolean;
  onToggle: (id: string, done: boolean) => void;
}) {
  return (
    <div className="task-list">
      {!plan?.items.some((t) => !completedOnly || t.done) ? (
        <Empty>
          {completedOnly ? "暂无打卡记录" : "今天留一点空白，也很好。"}
        </Empty>
      ) : (
        plan.items
          .map((t, i) => ({ t, i }))
          .filter(({ t }) => !completedOnly || t.done)
          .map(({ t, i }) => {
            const Icon = t.training
              ? Dumbbell
              : i === 0
                ? Utensils
                : i === 1
                  ? Moon
                  : i === 2
                    ? Footprints
                    : Droplets;
            return (
              <button
                disabled={!editable || busy}
                className={`task-card task-pastel-${i % 3} ${t.done ? "done" : ""}`}
                key={t.taskId}
                onClick={() => onToggle(t.taskId, !t.done)}
                aria-label={`${t.done ? "撤销" : "完成"} ${t.name}`}
              >
                {i % 3 === 0 ? (
                  <BalletLace />
                ) : i % 3 === 1 ? (
                  <BalletBow className="task-ribbon" />
                ) : (
                  <BalletLacing />
                )}
                <span className={`task-icon tone-${i % 4}`}>
                  <Icon size={23} strokeWidth={1.55} />
                </span>
                <span className="task-copy">
                  <strong>{t.name}</strong>
                </span>
                {t.done && <span className="task-xp">+{t.xp}</span>}
                <span className="task-check">
                  {t.done && <Check size={17} />}
                </span>
              </button>
            );
          })
      )}
    </div>
  );
}
