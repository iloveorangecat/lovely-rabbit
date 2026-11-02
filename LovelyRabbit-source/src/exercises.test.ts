import { it, expect } from "vitest";
import data from "../public/data/exercises.json";
import { activitySchema, activityLabels } from "./exercises";
import {
  exerciseCalories,
  saveExercise,
  type ExerciseEntry,
} from "./nutrition";
import {
  dateKey,
  shiftDate,
  initialState,
  parseBackup,
  validateState,
  totals,
} from "./model";
const today = dateKey();
function entry(): ExerciseEntry {
  return {
    id: "walk-1",
    date: today,
    name: "中速步行",
    minutes: 30,
    kcal: 114,
    source: "https://pacompendium.com/walking/",
    snapshot: {
      edition: "2024 Adult",
      code: "17190",
      met: 3.8,
      weightKg: 60,
      age: 30,
      description:
        "Walking, 2.8 to 3.4 mph, level, moderate pace, firm surface",
      estimatedMET: false,
      netKcal: 84,
    },
  };
}
it("imports 1111 unique official activities with original METs and valid Chinese shortcuts", () => {
  const a = activitySchema.array().parse(data.activities);
  expect(a).toHaveLength(1111);
  expect(new Set(a.map((v) => v.code)).size).toBe(1111);
  expect(a.find((v) => v.code === "17190")?.met).toBe(3.8);
  expect(a.some((v) => v.estimatedMET)).toBe(true);
  for (const code of Object.keys(activityLabels))
    expect(a.some((v) => v.code === code)).toBe(true);
});
it("calculates gross and incremental expenditure, updating without duplicate IDs or XP", () => {
  expect(exerciseCalories(3.8, 60, 30)).toBe(114);
  expect(exerciseCalories(2.8, 60, 30)).toBe(84);
  const s = initialState();
  const before = totals(s);
  saveExercise(s.nutrition, entry(), today);
  saveExercise(s.nutrition, entry(), today);
  expect(s.nutrition.exercises).toHaveLength(1);
  expect(totals(s)).toEqual(before);
});
it("round trips exact historical MET and weight snapshots despite profile changes", () => {
  const s = initialState();
  saveExercise(s.nutrition, entry(), today);
  s.weights.push({ date: today, kg: 80 });
  const restored = parseBackup(JSON.stringify(s));
  expect(restored.nutrition.exercises[0]).toEqual(entry());
});
it("rejects tampered calories, incomplete snapshots, duplicate records, future and invalid dates", () => {
  const s = initialState();
  saveExercise(s.nutrition, entry(), today);
  expect(() =>
    validateState({
      ...s,
      nutrition: { ...s.nutrition, exercises: [{ ...entry(), kcal: 115 }] },
    }),
  ).toThrow();
  expect(() =>
    validateState({
      ...s,
      nutrition: {
        ...s.nutrition,
        exercises: [{ ...entry(), snapshot: { met: 3.8 } }],
      },
    }),
  ).toThrow();
  expect(() =>
    validateState({
      ...s,
      nutrition: { ...s.nutrition, exercises: [entry(), entry()] },
    }),
  ).toThrow();
  expect(() =>
    saveExercise(s.nutrition, { ...entry(), date: shiftDate(today, 1) }, today),
  ).toThrow();
  expect(() =>
    validateState({
      ...s,
      nutrition: {
        ...s.nutrition,
        exercises: [{ ...entry(), date: "2026-02-30" }],
      },
    }),
  ).toThrow();
});
it("keeps existing version 2 exercise backups without newly added snapshots readable", () => {
  const s = initialState();
  const { snapshot, ...legacy } = entry();
  s.nutrition.exercises.push({
    ...legacy,
    minutes: 30.5,
    kcal: 120,
    source: "旧备份",
  });
  expect(
    parseBackup(JSON.stringify(s)).nutrition.exercises[0].snapshot,
  ).toBeUndefined();
});
it("rejects unsupported adult ages and invalid weight or duration", () => {
  const s = initialState();
  for (const age of [18, 60])
    expect(() =>
      saveExercise(
        s.nutrition,
        { ...entry(), snapshot: { ...entry().snapshot!, age } },
        today,
      ),
    ).toThrow();
  expect(() =>
    saveExercise(s.nutrition, { ...entry(), minutes: 0 }, today),
  ).toThrow();
  expect(() =>
    saveExercise(
      s.nutrition,
      { ...entry(), snapshot: { ...entry().snapshot!, weightKg: 0 } },
      today,
    ),
  ).toThrow();
});
