import { it, expect } from "vitest";
import reviewed from "../public/data/reviewed-foods.json";
import original from "../public/data/foods.json";
import approved from "../scripts/data/reviewed-100g.json";
import { foodSchema, saveMeal, mealEntryCalories } from "./nutrition";
import { searchFoods } from "./food-search";
import { initialState, dateKey, parseBackup, validateState } from "./model";
it("makes every approved food discoverable with its exact reviewed average", () => {
  const foods = foodSchema
    .array()
    .parse([...reviewed.foods, ...original.foods]);
  expect(reviewed.foods).toHaveLength(179);
  for (const f of approved.foods) {
    const found = searchFoods(foods, f.name).find(
      (v) => v.id === "review:" + f.id,
    );
    expect(found?.kcal100, f.name).toBe(f.kcalPer100g);
    expect(searchFoods(foods, f.name)[0].id).toBe("review:" + f.id);
  }
});
it("keeps grams and cup calories separate without inventing cup mass", () => {
  const s = initialState();
  const food = reviewed.foods.find((f) => f.name === "无糖豆浆")!;
  expect(food.kcal100).toBe(30);
  expect(food.portions?.[0].kcal).toBe(80);
  const cup = {
    id: "cup",
    date: dateKey(),
    meal: "早餐" as const,
    foodId: food.id,
    name: food.name,
    quantity: 1.5,
    unit: "杯" as const,
    gramsPerUnit: null,
    kcal100: 30,
    source: food.source,
    unitCalories: { kcal: 80, source: "用户资料" },
  };
  expect(mealEntryCalories(cup)).toBe(120);
  saveMeal(s.nutrition, cup, dateKey());
  expect(s.nutrition.servings).toHaveLength(0);
  expect(s.nutrition.meals[0].gramsPerUnit).toBeNull();
  expect(parseBackup(JSON.stringify(s)).nutrition.meals[0].kcal).toBe(120);
  expect(() =>
    saveMeal(s.nutrition, { ...cup, unit: "g" }, dateKey()),
  ).toThrow();
  s.nutrition.meals[0].kcal = 121;
  expect(() => validateState(s)).toThrow();
});
