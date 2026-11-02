import { it, expect } from "vitest";
import {
  basalEstimate,
  emptyNutrition,
  mealCalories,
  saveMeal,
  intakeFor,
  metabolicSchema,
} from "./nutrition";
import {
  dateKey,
  initialState,
  validateState,
  parseBackup,
  totals,
  shiftDate,
} from "./model";
const today = dateKey();
const profile = {
  sex: "female" as const,
  age: 30,
  heightCm: 160,
  weightKg: 60,
  activity: "sedentary" as const,
};
const entry = {
  id: "meal-1",
  date: today,
  meal: "早餐" as const,
  foodId: "food-1",
  name: "测试食物",
  quantity: 150,
  unit: "g" as const,
  gramsPerUnit: 1,
  kcal100: 120,
  source: "测试标签",
};
it("estimates adult metabolism without adding activity or exercise", () => {
  expect(basalEstimate(profile)).toBe(1289);
  expect(basalEstimate({ ...profile, activity: "active" })).toBe(1289);
  expect(
    basalEstimate({
      ...profile,
      sex: "male",
      age: 40,
      heightCm: 180,
      weightKg: 80,
    }),
  ).toBe(1730);
  expect(metabolicSchema.safeParse({ ...profile, age: 12 }).success).toBe(
    false,
  );
});
it("converts grams and user-calibrated portions including fractional quantities", () => {
  expect(mealCalories(150, 1, 120)).toBe(180);
  expect(mealCalories(1.5, 100, 120)).toBe(180);
  const n = emptyNutrition();
  saveMeal(
    n,
    { ...entry, unit: "个", quantity: 1.5, gramsPerUnit: 100 },
    today,
  );
  expect(n.servings[0].grams).toBe(100);
  expect(intakeFor(n, today)).toBe(180);
});
it("updates stable ids and separates meal types and historical dates", () => {
  const n = emptyNutrition();
  saveMeal(n, entry, today);
  saveMeal(n, { ...entry, quantity: 100 }, today);
  expect(n.meals).toHaveLength(1);
  expect(intakeFor(n, today, "早餐")).toBe(120);
  saveMeal(
    n,
    { ...entry, id: "meal-2", date: shiftDate(today, -5), meal: "午餐" },
    today,
  );
  expect(intakeFor(n, today, "午餐")).toBe(0);
  expect(intakeFor(n, shiftDate(today, -5))).toBe(180);
});
it("rejects invalid portions, future dates and inconsistent backup calories", () => {
  const n = emptyNutrition();
  expect(() => saveMeal(n, { ...entry, quantity: 0 }, today)).toThrow();
  expect(() =>
    saveMeal(n, { ...entry, date: shiftDate(today, 1) }, today),
  ).toThrow();
  expect(() =>
    saveMeal(
      n,
      { ...entry, unit: "碗", quantity: 10, gramsPerUnit: 2000 },
      today,
    ),
  ).toThrow();
  const s = initialState();
  saveMeal(s.nutrition, entry, today);
  s.nutrition.meals[0].kcal = 999;
  expect(() => validateState(s)).toThrow(/不一致/);
});
it("keeps point balances and nutrition snapshots independent of source changes", () => {
  const s = initialState(),
    before = totals(s);
  saveMeal(s.nutrition, entry, today);
  s.nutrition.foods.push({
    id: "food-1",
    name: "测试食物",
    category: "我的食物",
    kcal100: 999,
    source: "标签",
  });
  expect(s.nutrition.meals[0].kcal).toBe(180);
  expect(totals(s)).toEqual(before);
});
it("migrates v1 records and round trips the v2 nutrition data", () => {
  const s = initialState(),
    old = JSON.parse(JSON.stringify(s));
  old.version = 1;
  delete old.nutrition;
  const restored = parseBackup(JSON.stringify(old));
  expect(restored.version).toBe(2);
  expect(restored.tasks).toEqual(s.tasks);
  expect(restored.nutrition).toEqual(emptyNutrition());
  saveMeal(restored.nutrition, entry, today);
  restored.nutrition.profile = profile;
  expect(parseBackup(JSON.stringify(restored))).toEqual(restored);
  restored.nutrition.meals.push({ ...restored.nutrition.meals[0] });
  expect(() => validateState(restored)).toThrow(/重复/);
});
