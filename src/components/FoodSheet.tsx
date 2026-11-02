import { useEffect, useState } from "react";
import { Search, ChevronLeft } from "lucide-react";
import {
  foodSchema,
  mealNames,
  servingUnits,
  mealCalories,
  formatKcal,
  type Food,
  type MealEntry,
  type Nutrition,
} from "../nutrition";
import { uid } from "../model";
import { QuantityRuler } from "./QuantityRuler";
import { searchFoods } from "../food-search";
let catalog: Promise<Food[]> | null = null;
function loadCatalog() {
  if (!catalog)
    catalog = Promise.all(
      ["reviewed-foods.json", "foods.json"].map((file) =>
        fetch(`${import.meta.env.BASE_URL}data/${file}`)
          .then((r) => {
            if (!r.ok) throw new Error("食物库下载失败");
            return r.json();
          })
          .then((v) => foodSchema.array().parse(v.foods)),
      ),
    )
      .then((parts) => parts.flat())
      .catch((e) => {
        catalog = null;
        throw e;
      });
  return catalog;
}
export function FoodSheet({
  nutrition,
  date,
  meal,
  entry,
  onSave,
  onRemember,
}: {
  nutrition: Nutrition;
  date: string;
  meal: (typeof mealNames)[number];
  entry?: MealEntry;
  onSave: (v: Omit<MealEntry, "kcal">, custom?: Food) => Promise<boolean>;
  onRemember: (food: Food) => Promise<Food | null>;
}) {
  const [foods, setFoods] = useState<Food[]>([]),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [manual, setManual] = useState(false),
    [loading, setLoading] = useState(true);
  const [food, setFood] = useState<Food | null>(
    entry
      ? {
          id: entry.foodId,
          name: entry.name,
          kcal100: entry.kcal100,
          source: entry.source,
          category: "已记录食物",
          ...(entry.unitCalories && entry.unit !== "g"
            ? {
                portions: [
                  {
                    unit: entry.unit,
                    kcal: entry.unitCalories.kcal,
                    source: entry.unitCalories.source,
                  },
                ],
              }
            : {}),
        }
      : null,
  );
  const [unit, setUnit] = useState<MealEntry["unit"]>(entry?.unit ?? "g"),
    [quantity, setQuantity] = useState(entry?.quantity ?? 100),
    [grams, setGrams] = useState(String(entry?.gramsPerUnit ?? "")),
    [busy, setBusy] = useState(false),
    [mealType, setMealType] = useState(meal);
  useEffect(() => {
    let alive = true;
    loadCatalog()
      .then((v) => {
        if (alive) {
          setFoods(v);
          if (entry)
            setFood((current) => {
              if (current?.id !== entry.foodId) return current;
              const extras =
                v.find((f) => f.id === entry.foodId)?.portions ?? [];
              const previous = current.portions ?? [];
              return {
                ...current,
                portions: [
                  ...previous,
                  ...extras.filter(
                    (p) => !previous.some((old) => old.unit === p.unit),
                  ),
                ],
              };
            });
        }
      })
      .catch(() => {
        if (alive) setError("食物库暂不可用，仍可按标签手动添加。");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);
  const choose = (f: Food) => {
    setFood(f);
    setError("");
    const saved = nutrition.servings.find((v) => v.foodId === f.id);
    setUnit(saved?.unit ?? "g");
    setGrams(saved ? String(saved.grams) : "");
    setQuantity(saved ? 1 : 100);
  };
  const unitCalories =
    unit !== "g" ? food?.portions?.find((p) => p.unit === unit) : undefined;
  const perUnit = unitCalories ? null : unit === "g" ? 1 : Number(grams),
    calories = unitCalories
      ? Math.round(quantity * unitCalories.kcal * 10) / 10
      : food
        ? mealCalories(quantity, perUnit ?? 0, food.kcal100)
        : 0;
  const q = query.normalize("NFKC").trim().toLowerCase();
  const recentIds = new Set(nutrition.meals.slice(-30).map((v) => v.foodId));
  const results = searchFoods([...nutrition.foods, ...foods], query, recentIds);
  if (!food)
    return (
      <div className="food-select">
        <div className="meal-tabs" role="group" aria-label="选择餐次">
          {mealNames.map((m) => (
            <button
              key={m}
              className={mealType === m ? "selected" : ""}
              onClick={() => setMealType(m)}
            >
              {m}
            </button>
          ))}
        </div>
        <div className="food-search">
          <Search size={17} />
          <input
            aria-label="搜索食物"
            placeholder="搜索食物，如米饭、鸡腿、苹果"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {q && !loading && !results.length && (
          <button className="text-button" onClick={() => setManual(!manual)}>
            {manual ? "返回食物库" : "找不到？按包装标签手动添加"}
          </button>
        )}
        {manual ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const parsed = foodSchema.safeParse({
                id: uid(),
                name: String(f.get("name")).trim(),
                category: "我的食物",
                kcal100: Number(f.get("energy")),
                source: "用户填写的营养标签",
              });
              if (parsed.success) {
                if (busy) return;
                setBusy(true);
                try {
                  const stored = await onRemember(parsed.data);
                  if (stored) choose(stored);
                } finally {
                  setBusy(false);
                }
              } else setError("请检查食物名称和热量。");
            }}
          >
            <label>
              食物名称
              <input
                name="name"
                aria-label="自定义食物名称"
                required
                maxLength={100}
              />
            </label>
            <label>
              每 100g 热量（千卡）
              <input
                name="energy"
                aria-label="每100g热量"
                type="number"
                required
                min="0"
                max="1000"
                step=".1"
              />
            </label>
            <button className="secondary wide" disabled={busy}>
              {busy ? "保存中…" : "使用这项食物"}
            </button>
          </form>
        ) : q ? (
          <div className="food-results" aria-label="食物搜索结果">
            {loading && <p className="muted">正在打开本地食物库…</p>}
            {!loading && !results.length && (
              <p className="muted">没有找到匹配项，可以手动添加。</p>
            )}
            {results.map((f) => (
              <button
                key={f.id}
                className="food-result"
                onClick={() => choose(f)}
              >
                <span>
                  <strong>{f.name}</strong>
                  <small>
                    {f.category}
                    {recentIds.has(f.id) ? " · 最近吃过" : ""}
                  </small>
                </span>
                <em>
                  {f.kcal100}
                  <small> 千卡/100g</small>
                </em>
              </button>
            ))}
            {!q && !loading && (
              <p className="muted">显示部分食物，输入名称可搜索完整目录。</p>
            )}
          </div>
        ) : null}
        {error && (
          <p className="danger-text" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  return (
    <form
      className="food-amount-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        if (
          !quantity ||
          (!unitCalories && !perUnit) ||
          !Number.isFinite(calories) ||
          (perUnit !== null && quantity * perUnit > 10000)
        ) {
          setError("请填写有效数量与每份重量，单条最多 10000g");
          return;
        }
        setBusy(true);
        setError("");
        try {
          await onSave(
            {
              id: entry?.id ?? uid(),
              date,
              meal: mealType,
              foodId: food.id,
              name: food.name,
              quantity,
              unit,
              gramsPerUnit: perUnit,
              kcal100: food.kcal100,
              source: food.source,
              ...(unitCalories
                ? {
                    unitCalories: {
                      kcal: unitCalories.kcal,
                      source: unitCalories.source,
                    },
                  }
                : {}),
            },
            food.category === "我的食物" ? food : undefined,
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <button
        type="button"
        className="text-button"
        onClick={() => {
          setFood(null);
          setError("");
        }}
      >
        <ChevronLeft size={16} />
        重新选择食物
      </button>
      <h3 className="selected-food-name">{food.name}</h3>
      <p className="muted">
        {date} · {mealType} · {food.kcal100} 千卡/100g
      </p>
      <QuantityRuler
        value={quantity}
        onChange={setQuantity}
        grams={unit === "g"}
        unitControl={
          <select
            aria-label="食用单位"
            value={unit}
            onChange={(e) => {
              const u = e.target.value as MealEntry["unit"];
              setUnit(u);
              setQuantity(u === "g" ? 100 : 1);
              const saved = nutrition.servings.find(
                (v) => v.foodId === food.id && v.unit === u,
              );
              setGrams(saved ? String(saved.grams) : "");
            }}
          >
            {servingUnits.map((u) => (
              <option key={u} value={u}>
                {u === "g" ? "g（克）" : u}
              </option>
            ))}
          </select>
        }
      />
      {unitCalories && (
        <p className="muted">
          每 {unit} {unitCalories.kcal} 千卡 · 按资料中的常用单位热量计算
        </p>
      )}
      {unit !== "g" && !unitCalories && (
        <label className="portion-calibration">
          1 {unit}的可食重量（g）
          <input
            aria-label="每份可食重量"
            type="number"
            inputMode="decimal"
            required
            min=".1"
            max="5000"
            step=".1"
            placeholder="首次设置一次，以后自动记住"
            value={grams}
            onChange={(e) => setGrams(e.target.value)}
          />
          <small>
            原库没有标准“个/碗”重量。可填实测值或自己的估算，带骨、带皮部分不重复计入。
          </small>
        </label>
      )}
      <div className="meal-preview">
        <span>
          {quantity || 0} {unit}
        </span>
        <strong>
          约 {Number.isFinite(calories) ? formatKcal(calories) : "—"}{" "}
          <small>千卡</small>
        </strong>
      </div>
      {error && (
        <p className="danger-text" role="alert">
          {error}
        </p>
      )}
      <button
        className="primary wide"
        disabled={
          busy || quantity <= 0 || (!unitCalories && (perUnit ?? 0) <= 0)
        }
      >
        {busy ? "保存中…" : entry ? "保存饮食修改" : "添加饮食记录"}
      </button>
    </form>
  );
}
