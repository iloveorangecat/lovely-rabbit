import { z } from "zod";
export const mealNames = ["早餐", "午餐", "晚餐", "加餐"] as const;
export const servingUnits = [
  "g",
  "个",
  "碗",
  "杯",
  "片",
  "份",
  "盒",
  "袋",
] as const;
const text = z.string().trim().min(1).max(120);
const key = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const customExerciseSchema = z
  .object({
    id: text,
    name: text,
    minutes: z.number().positive().max(1440),
    kcal: z.number().min(0).max(100000),
    source: text,
  })
  .strict();
export type CustomExercise = z.infer<typeof customExerciseSchema>;
export const exerciseSnapshotSchema = z
  .object({
    edition: z.literal("2024 Adult"),
    code: z.string().regex(/^\d{5}$/),
    met: z.number().positive().max(30),
    weightKg: z.number().min(20).max(300),
    age: z.number().int().min(19).max(59),
    description: z.string().min(1).max(2000),
    estimatedMET: z.boolean(),
    netKcal: z.number().min(0).max(100000),
  })
  .strict();
export const exerciseEntrySchema = z
  .object({
    id: text,
    date: key,
    name: z.string().trim().min(1).max(2000),
    minutes: z.number().positive().max(1440),
    kcal: z.number().min(0).max(100000),
    source: z.string().url().max(300).or(text),
    snapshot: exerciseSnapshotSchema.optional(),
    custom: customExerciseSchema.optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (
      v.custom &&
      (v.snapshot ||
        Math.abs(v.kcal - customExerciseCalories(v.custom, v.minutes)) > 0.01)
    )
      ctx.addIssue({
        code: "custom",
        message: "自定义运动热量与参考时长不一致",
      });
    if (
      v.snapshot &&
      (Math.abs(
        v.kcal -
          exerciseCalories(v.snapshot.met, v.snapshot.weightKg, v.minutes),
      ) > 0.01 ||
        Math.abs(
          v.snapshot.netKcal -
            exerciseCalories(
              Math.max(0, v.snapshot.met - 1),
              v.snapshot.weightKg,
              v.minutes,
            ),
        ) > 0.01)
    )
      ctx.addIssue({
        code: "custom",
        message: "运动消耗与记录的 MET、体重或时长不一致",
      });
  });
export type ExerciseEntry = z.infer<typeof exerciseEntrySchema>;
export function customExerciseCalories(
  definition: CustomExercise,
  minutes: number,
) {
  return Math.round((definition.kcal / definition.minutes) * minutes * 10) / 10;
}
export function rememberFood(n: Nutrition, food: Food): Food {
  const parsed = foodSchema.parse(food);
  const found = n.foods.find(
    (v) =>
      v.name.normalize("NFKC") === parsed.name.normalize("NFKC") &&
      v.kcal100 === parsed.kcal100,
  );
  if (found) return found;
  if (n.foods.some((v) => v.id === parsed.id))
    throw new Error("食物编号已存在");
  n.foods.push(parsed);
  return parsed;
}
export function rememberExercise(
  n: Nutrition,
  exercise: CustomExercise,
): CustomExercise {
  const parsed = customExerciseSchema.parse(exercise);
  const found = n.customExercises.find(
    (v) =>
      v.name === parsed.name &&
      v.minutes === parsed.minutes &&
      v.kcal === parsed.kcal,
  );
  if (found) return found;
  if (n.customExercises.some((v) => v.id === parsed.id))
    throw new Error("运动编号已存在");
  n.customExercises.push(parsed);
  return parsed;
}
export function exerciseCalories(
  met: number,
  weightKg: number,
  minutes: number,
) {
  return Math.round(((met * weightKg * minutes) / 60) * 10) / 10;
}
export function saveExercise(
  n: Nutrition,
  input: ExerciseEntry,
  today: string,
) {
  if (input.date > today) throw new Error("不能提前记录未来的运动");
  const entry = exerciseEntrySchema.parse(input);
  const at = n.exercises.findIndex((v) => v.id === entry.id);
  if (at < 0) n.exercises.push(entry);
  else n.exercises[at] = entry;
}
export const metabolicSchema = z
  .object({
    sex: z.enum(["female", "male"]),
    age: z.number().int().min(18).max(100),
    heightCm: z.number().min(100).max(230),
    weightKg: z.number().min(20).max(300),
    activity: z.enum(["sedentary", "light", "moderate", "active"]),
  })
  .strict();
export const foodSchema = z
  .object({
    id: text,
    name: text,
    category: text,
    kcal100: z.number().min(0).max(1000),
    source: text,
    portions: z
      .array(
        z
          .object({
            unit: z.enum(servingUnits).refine((u) => u !== "g"),
            kcal: z.number().min(0).max(50000),
            source: text,
          })
          .strict(),
      )
      .max(20)
      .optional(),
  })
  .strict();
export const mealEntrySchema = z
  .object({
    id: text,
    date: key,
    meal: z.enum(mealNames),
    foodId: text,
    name: text,
    quantity: z.number().positive().max(5000),
    unit: z.enum(servingUnits),
    gramsPerUnit: z.number().positive().max(5000).nullable(),
    kcal100: z.number().min(0).max(1000),
    kcal: z.number().min(0).max(50000),
    source: text,
    unitCalories: z
      .object({ kcal: z.number().min(0).max(50000), source: text })
      .strict()
      .optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (
      v.unitCalories
        ? v.unit === "g" || v.gramsPerUnit !== null
        : v.gramsPerUnit === null
    )
      ctx.addIssue({
        code: "custom",
        message: "常用单位热量与重量换算模式不一致",
      });
  });
export const nutritionSchema = z
  .object({
    setupSeen: z.boolean(),
    profile: metabolicSchema.nullable(),
    meals: z.array(mealEntrySchema).max(100000),
    foods: z.array(foodSchema).max(3000),
    servings: z
      .array(
        z
          .object({
            foodId: text,
            unit: z.enum(servingUnits),
            grams: z.number().positive().max(5000),
          })
          .strict(),
      )
      .max(10000),
    exercises: z.array(exerciseEntrySchema).max(100000),
    customExercises: z.array(customExerciseSchema).max(3000).default([]),
  })
  .strict();
export type Nutrition = z.infer<typeof nutritionSchema>;
export type MetabolicProfile = z.infer<typeof metabolicSchema>;
export type Food = z.infer<typeof foodSchema>;
export type MealEntry = z.infer<typeof mealEntrySchema>;
export const emptyNutrition = (): Nutrition => ({
  setupSeen: false,
  profile: null,
  meals: [],
  foods: [],
  servings: [],
  exercises: [],
  customExercises: [],
});
export function basalEstimate(p: MetabolicProfile, weight = p.weightKg) {
  return Math.round(
    10 * weight + 6.25 * p.heightCm - 5 * p.age + (p.sex === "male" ? 5 : -161),
  );
}
export function mealCalories(
  quantity: number,
  gramsPerUnit: number,
  kcal100: number,
) {
  return Math.round(((quantity * gramsPerUnit * kcal100) / 100) * 10) / 10;
}
export function mealEntryCalories(input: Omit<MealEntry, "kcal">) {
  return input.unitCalories
    ? Math.round(input.quantity * input.unitCalories.kcal * 10) / 10
    : mealCalories(input.quantity, input.gramsPerUnit ?? 0, input.kcal100);
}
export function saveMeal(
  n: Nutrition,
  input: Omit<MealEntry, "kcal">,
  today: string,
) {
  if (input.date > today) throw new Error("不能提前记录未来的饮食");
  const kcal = mealEntryCalories(input);
  const entry = mealEntrySchema.parse({ ...input, kcal });
  if (
    entry.gramsPerUnit !== null &&
    entry.quantity * entry.gramsPerUnit > 10000
  )
    throw new Error("单条食物重量不能超过 10000 g");
  if (entry.unit === "g" && entry.gramsPerUnit !== 1)
    throw new Error("克数换算不正确");
  const at = n.meals.findIndex((v) => v.id === entry.id);
  if (at < 0) n.meals.push(entry);
  else n.meals[at] = entry;
  if (entry.unit !== "g" && entry.gramsPerUnit !== null) {
    const previous = n.servings.findIndex(
      (v) => v.foodId === entry.foodId && v.unit === entry.unit,
    );
    const portion = {
      foodId: entry.foodId,
      unit: entry.unit,
      grams: entry.gramsPerUnit,
    };
    if (previous < 0) n.servings.push(portion);
    else n.servings[previous] = portion;
  }
}
export function intakeFor(n: Nutrition, date: string, meal?: string) {
  return (
    Math.round(
      n.meals
        .filter((v) => v.date === date && (!meal || v.meal === meal))
        .reduce((sum, v) => sum + v.kcal, 0) * 10,
    ) / 10
  );
}
export const formatKcal = (value: number) =>
  Math.round(value).toLocaleString("zh-CN");
