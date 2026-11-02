import { it, expect } from "vitest";
import {
  rememberFood,
  rememberExercise,
  customExerciseCalories,
  saveExercise,
} from "./nutrition";
import { initialState, parseBackup, validateState, dateKey } from "./model";
const food = {
  id: "my-food",
  name: "自制饭",
  category: "我的食物",
  kcal100: 110,
  source: "我的标签",
};
const exercise = {
  id: "my-exercise",
  name: "自选课程",
  minutes: 30,
  kcal: 120,
  source: "设备参考值",
};
it("keeps reusable definitions without any food or exercise log and deduplicates identical additions", () => {
  const s = initialState();
  rememberFood(s.nutrition, food);
  rememberExercise(s.nutrition, exercise);
  expect(rememberFood(s.nutrition, { ...food, id: "another-food" }).id).toBe(
    food.id,
  );
  expect(
    rememberExercise(s.nutrition, { ...exercise, id: "another-exercise" }).id,
  ).toBe(exercise.id);
  expect(s.nutrition.foods).toHaveLength(1);
  expect(s.nutrition.customExercises).toHaveLength(1);
  const restored = parseBackup(JSON.stringify(s));
  expect(restored.nutrition.foods[0]).toEqual(food);
  expect(restored.nutrition.customExercises[0]).toEqual(exercise);
});
it("preserves old backups without a custom exercise catalog", () => {
  const s = initialState();
  const { customExercises, ...oldNutrition } = s.nutrition;
  expect(
    parseBackup(JSON.stringify({ ...s, nutrition: oldNutrition })).nutrition
      .customExercises,
  ).toEqual([]);
});
it("freezes custom exercise rates and rejects inconsistent estimates or duplicate catalog IDs", () => {
  const s = initialState();
  rememberExercise(s.nutrition, exercise);
  expect(customExerciseCalories(exercise, 60)).toBe(240);
  const entry = {
    id: "record",
    date: dateKey(),
    name: exercise.name,
    minutes: 60,
    kcal: 240,
    source: exercise.source,
    custom: { ...exercise },
  };
  saveExercise(s.nutrition, entry, dateKey());
  s.nutrition.customExercises[0].kcal = 150;
  expect(validateState(s).nutrition.exercises[0].kcal).toBe(240);
  expect(() =>
    saveExercise(s.nutrition, { ...entry, kcal: 241 }, dateKey()),
  ).toThrow();
  s.nutrition.customExercises.push({ ...exercise });
  expect(() => validateState(s)).toThrow();
});
