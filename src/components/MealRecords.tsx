import { Utensils, Dumbbell, Pencil, Trash2 } from "lucide-react";
import {
  formatKcal,
  type Nutrition,
  type MealEntry,
  type ExerciseEntry,
} from "../nutrition";
export function MealRecords({
  nutrition,
  date,
  onEdit,
  onDelete,
  onDeleteExercise,
  onEditExercise,
}: {
  nutrition: Nutrition;
  date: string;
  onEdit: (e: MealEntry) => void;
  onDelete: (id: string) => void;
  onDeleteExercise: (id: string) => void;
  onEditExercise: (e: ExerciseEntry) => void;
}) {
  const meals = nutrition.meals.filter((v) => v.date === date),
    exercises = nutrition.exercises.filter((v) => v.date === date);
  return (
    <div className="meal-records">
      {!meals.length && !exercises.length && (
        <div className="empty">
          <p>这一天还没有饮食或运动记录</p>
        </div>
      )}
      {meals.map((m, i) => (
        <article
          className={`task-card meal-record task-pastel-${i % 3}`}
          key={m.id}
        >
          <span className="task-icon">
            <Utensils size={23} />
          </span>
          <div className="task-copy">
            <strong>{m.name}</strong>
            <small>
              {m.meal} · {m.quantity} {m.unit}
            </small>
          </div>
          <span className="meal-record-energy">
            约 {formatKcal(m.kcal)}
            <small>千卡</small>
          </span>
          <div className="meal-record-actions">
            <button
              className="icon-button"
              aria-label={`编辑饮食 ${m.name}`}
              onClick={() => onEdit(m)}
            >
              <Pencil size={15} />
            </button>
            <button
              className="icon-button"
              aria-label={`删除饮食 ${m.name}`}
              onClick={() => onDelete(m.id)}
            >
              <Trash2 size={15} />
            </button>
          </div>
        </article>
      ))}
      {exercises.map((e) => (
        <article className="task-card meal-record task-pastel-2" key={e.id}>
          <span className="task-icon">
            <Dumbbell size={23} />
          </span>
          <div className="task-copy">
            <strong>{e.name}</strong>
            <small>{e.minutes} 分钟</small>
          </div>
          <span className="meal-record-energy">
            约 {formatKcal(e.kcal)}
            <small>千卡</small>
          </span>
          <div className="meal-record-actions">
            <button
              className="icon-button"
              aria-label={`编辑运动 ${e.name}`}
              onClick={() => onEditExercise(e)}
            >
              <Pencil size={15} />
            </button>
            <button
              className="icon-button"
              aria-label={`删除运动 ${e.name}`}
              onClick={() => onDeleteExercise(e.id)}
            >
              <Trash2 size={15} />
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
