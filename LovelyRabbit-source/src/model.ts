import { z } from "zod";
import {
  nutritionSchema,
  emptyNutrition,
  mealEntryCalories,
} from "./nutrition";
export const dateKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export function shiftDate(key: string, n: number) {
  const d = new Date(`${key}T12:00:00`);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}
export const uid = () => crypto.randomUUID();
const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) => !isNaN(Date.parse(v)) && dateKey(new Date(`${v}T12:00:00`)) === v,
    "无效日期",
  );
const id = z.string().min(1).max(100);
const name = z.string().trim().min(1).max(80);
const xp = z.number().int().min(2).max(6);
export const taskSchema = z
  .object({
    id,
    name,
    days: z.array(z.number().int().min(0).max(6)).min(1).max(7),
    xp: xp.nullable(),
    training: z.boolean(),
    created: day,
    archived: z.boolean(),
  })
  .strict();
export const rewardSchema = z
  .object({
    id,
    name,
    cost: z.number().int().min(1).max(100000),
    icon: z.enum([
      "gift",
      "flower",
      "coffee",
      "film",
      "shopping",
      "game",
      "heart",
    ]),
    image: z
      .string()
      .max(750000)
      .refine(
        (v) =>
          v === "" ||
          /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v),
      ),
    stage: z.boolean(),
  })
  .strict();
const planSchema = z
  .object({
    date: day,
    items: z
      .array(
        z
          .object({
            taskId: id,
            name,
            xp,
            training: z.boolean(),
            done: z.boolean(),
            awarded: z.boolean().optional(),
          })
          .strict(),
      )
      .max(8),
  })
  .strict();
const redemptionSchema = z
  .object({
    id,
    rewardId: id,
    name,
    cost: z.number().int().min(1).max(100000),
    date: day,
  })
  .strict();
export const stateSchema = z
  .object({
    version: z.literal(2),
    nutrition: nutritionSchema,
    started: day,
    onboarded: z.boolean(),
    profile: z
      .object({
        nickname: z.string().trim().min(1).max(30),
        targetKg: z.number().min(20).max(300),
        unit: z.enum(["kg", "斤"]),
        dark: z.boolean(),
      })
      .strict(),
    tasks: z.array(taskSchema).max(200),
    rewards: z.array(rewardSchema).min(1).max(100),
    plans: z.array(planSchema).max(40000),
    redemptions: z.array(redemptionSchema).max(100000),
    weights: z
      .array(z.object({ date: day, kg: z.number().min(20).max(300) }).strict())
      .max(40000),
    reflections: z
      .array(
        z
          .object({
            id,
            date: day,
            answers: z.array(z.string().max(1000)).length(4).optional(),
            text: z.string().trim().min(1).max(20000).optional(),
          })
          .strict()
          .refine(
            (r) => r.text !== undefined || r.answers !== undefined,
            "日记内容不能为空",
          ),
      )
      .max(10000),
  })
  .strict();
const legacyStateSchema = stateSchema
  .omit({ nutrition: true })
  .extend({ version: z.literal(1) })
  .strict();
export type State = z.infer<typeof stateSchema>;
export type Task = z.infer<typeof taskSchema>;
export type Reward = z.infer<typeof rewardSchema>;
export type Plan = State["plans"][number];
export const thresholds = [66, 128, 188, 218, 288, 388, 468, 568, 648];
export const titles = [
  "初绽新芽",
  "晨露花苞",
  "微光花语",
  "柔光蔷薇",
  "珍珠花冠",
  "月光女主",
  "星河缪斯",
  "璀璨盛放",
  "永恒花园",
];
export const rewardNames = [
  "买一个发饰",
  "看一部想看的电影",
  "一次悠闲下午茶",
  "喜欢的美妆小物",
  "一件漂亮衣服",
  "为自己安排一次小旅行",
  "收藏一束鲜花",
  "一次期待的体验",
  "给喜欢的游戏充一个648",
];
export function initialState(today = dateKey()): State {
  return {
    version: 2,
    nutrition: emptyNutrition(),
    started: today,
    onboarded: false,
    profile: { nickname: "兔兔", targetKg: 50, unit: "斤", dark: false },
    tasks: ["热量缺口300kcal", "喝水1500ml", "走路10000步", "12点前睡觉"].map(
      (name) => ({
        id: uid(),
        name,
        days: [0, 1, 2, 3, 4, 5, 6],
        xp: null,
        training: false,
        created: today,
        archived: false,
      }),
    ),
    rewards: thresholds.slice(0, 6).map((cost, i) => ({
      id: uid(),
      name: rewardNames[i],
      cost,
      icon: (
        ["flower", "film", "coffee", "shopping", "heart", "gift"] as const
      )[i],
      image: "",
      stage: true,
    })),
    plans: [],
    redemptions: [],
    weights: [],
    reflections: [],
  };
}
export function totals(s: State) {
  const lifetimeXP = s.plans.reduce(
    (sum, p) =>
      sum + p.items.filter((i) => i.done).reduce((n, i) => n + i.xp, 0),
    0,
  );
  return {
    lifetimeXP,
    availableXP: lifetimeXP - s.redemptions.reduce((n, r) => n + r.cost, 0),
  };
}
export const stages = (s: State) =>
  s.rewards.filter((r) => r.stage).sort((a, b) => a.cost - b.cost);
export function progress(s: State) {
  const list = stages(s),
    { lifetimeXP } = totals(s);
  const index = list.filter((r) => lifetimeXP >= r.cost).length;
  const before = list[index - 1]?.cost ?? 0;
  const next = list[index]?.cost;
  return {
    index,
    title: titles[Math.min(index, titles.length - 1)],
    next,
    percent: next
      ? Math.max(
          0,
          Math.min(100, ((lifetimeXP - before) / (next - before)) * 100),
        )
      : 100,
  };
}
export function scheduled(s: State, key: string) {
  const weekday = new Date(`${key}T12:00:00`).getDay();
  return s.tasks.filter(
    (t) => !t.archived && t.created <= key && t.days.includes(weekday),
  );
}
export function ensurePlan(s: State, key: string, today = dateKey()) {
  if (key > today || key < shiftDate(today, -3))
    throw new Error("只可记录今天和最近 3 天");
  let plan = s.plans.find((p) => p.date === key);
  if (!plan) {
    plan = {
      date: key,
      items: scheduled(s, key)
        .slice(0, 8)
        .map((t) => ({
          taskId: t.id,
          name: t.name,
          xp: 2,
          training: t.training,
          done: false,
          awarded: false,
        })),
    };
    s.plans.push(plan);
  }
  return plan;
}
export function complete(
  s: State,
  key: string,
  taskId: string,
  done: boolean,
  today = dateKey(),
) {
  const plan = ensurePlan(s, key, today);
  const item = plan.items.find((i) => i.taskId === taskId);
  if (!item) throw new Error("当日没有这项任务");
  if (item.done === done) return;
  if (!done && totals(s).availableXP < item.xp)
    throw new Error("这笔积分已用于兑换，当前余额不足以撤销");
  // Older snapshots already contain a decided roll; preserve those values.
  // New random tasks are rolled only on their first successful completion.
  if (done && item.awarded === false) {
    item.xp = Math.floor(Math.random() * 5) + 2;
  }
  if (done) item.awarded = true;
  item.done = done;
}
export function redeem(s: State, rewardId: string, today = dateKey()) {
  const r = s.rewards.find((r) => r.id === rewardId);
  if (!r) throw new Error("奖励不存在");
  const t = totals(s);
  if (t.lifetimeXP < r.cost) throw new Error("累计经验尚未达到该心愿门槛");
  if (t.availableXP < r.cost)
    throw new Error("可用积分不足，再收藏一点日常的努力吧");
  s.redemptions.push({
    id: uid(),
    rewardId: r.id,
    name: r.name,
    cost: r.cost,
    date: today,
  });
}
export function saveTask(s: State, task: Task, today = dateKey()) {
  task = { ...task, xp: null };
  const active = s.tasks
    .filter((t) => !t.archived && t.id !== task.id)
    .concat(task);
  if (
    Array.from(
      { length: 7 },
      (_, d) => active.filter((t) => t.days.includes(d)).length,
    ).some((n) => n > 8)
  )
    throw new Error("每天最多安排 8 个任务，请调整任务或执行日");
  const at = s.tasks.findIndex((t) => t.id === task.id);
  if (at < 0) s.tasks.push(task);
  else s.tasks[at] = task;
  const p = s.plans.find((p) => p.date === today);
  if (p) {
    const old = p.items.find((i) => i.taskId === task.id);
    const due = task.days.includes(new Date(`${today}T12:00:00`).getDay());
    if (old && !old.done) {
      if (!due) p.items = p.items.filter((i) => i !== old);
      else
        Object.assign(old, {
          name: task.name,
          xp: old.awarded === false ? 2 : old.xp,
          training: task.training,
        });
    } else if (!old && due) {
      if (p.items.length >= 8)
        throw new Error("今天的任务快照已满 8 项，明天再添加吧");
      p.items.push({
        taskId: task.id,
        name: task.name,
        xp: 2,
        training: task.training,
        done: false,
        awarded: false,
      });
    }
  }
}
export function validateState(input: unknown): State {
  const legacy =
    typeof input === "object" &&
    input !== null &&
    "version" in input &&
    input.version === 1;
  const s = stateSchema.parse(
    legacy
      ? {
          ...legacyStateSchema.parse(input),
          version: 2,
          nutrition: emptyNutrition(),
        }
      : input,
  );
  const unique = (xs: string[]) => new Set(xs).size === xs.length;
  if (
    !unique(s.nutrition.meals.map((v) => v.id)) ||
    !unique(s.nutrition.foods.map((v) => v.id)) ||
    !unique(s.nutrition.exercises.map((v) => v.id)) ||
    !unique(s.nutrition.customExercises.map((v) => v.id)) ||
    !unique(s.nutrition.servings.map((v) => v.foodId + "|" + v.unit))
  )
    throw new Error("饮食或运动记录重复");
  for (const entry of [...s.nutrition.meals, ...s.nutrition.exercises]) {
    day.parse(entry.date);
    if (entry.date > dateKey()) throw new Error("备份含未来的饮食或运动日期");
  }
  if (
    s.nutrition.meals.some(
      (v) =>
        (v.gramsPerUnit !== null && v.quantity * v.gramsPerUnit > 10000) ||
        (v.unit === "g" && v.gramsPerUnit !== 1) ||
        Math.abs(v.kcal - mealEntryCalories(v)) > 0.01,
    )
  )
    throw new Error("饮食热量或份量数据不一致");
  if (
    !unique(s.tasks.map((t) => t.id)) ||
    !unique(s.rewards.map((t) => t.id)) ||
    !unique(s.plans.map((t) => t.date)) ||
    !unique(s.redemptions.map((t) => t.id)) ||
    !unique(s.weights.map((t) => t.date)) ||
    !unique(s.reflections.map((t) => t.id))
  )
    throw new Error("备份含重复记录");
  if (
    s.plans.some(
      (p) =>
        !unique(p.items.map((i) => i.taskId)) ||
        p.items.some((i) => i.done && i.awarded === false) ||
        p.date < s.started ||
        p.items.some(
          (i) => !s.tasks.some((t) => t.id === i.taskId && t.created <= p.date),
        ),
    ) ||
    totals(s).availableXP < 0
  )
    throw new Error("备份积分或任务记录不一致");
  if (stages(s).length < 1 || !unique(stages(s).map((r) => String(r.cost))))
    throw new Error("阶段门槛必须唯一且至少保留一个阶段");
  if (
    Array.from(
      { length: 7 },
      (_, d) => s.tasks.filter((t) => !t.archived && t.days.includes(d)).length,
    ).some((n) => n > 8)
  )
    throw new Error("备份的每日任务超过 8 个");
  if (
    s.plans.some((p) => p.date > dateKey()) ||
    s.weights.some((w) => w.date > dateKey()) ||
    s.redemptions.some((r) => r.date > dateKey()) ||
    s.reflections.some((r) => r.date > dateKey()) ||
    s.tasks.some((t) => t.created > dateKey()) ||
    s.started > dateKey()
  )
    throw new Error("备份含未来日期");
  if (s.started < shiftDate(dateKey(), -39999))
    throw new Error("备份日期跨度超过可支持的范围");
  return s;
}
export function parseBackup(text: string) {
  if (text.length > 15000000) throw new Error("备份不能超过 15MB");
  return validateState(JSON.parse(text));
}
// Fill the days between visits before edits can change the current schedule.
export function fillPlans(s: State, today = dateKey()) {
  const dates = new Set(s.plans.map((p) => p.date));
  for (let key = s.started; key <= today; key = shiftDate(key, 1)) {
    if (!dates.has(key))
      s.plans.push({
        date: key,
        items: scheduled(s, key)
          .slice(0, 8)
          .map((t) => ({
            taskId: t.id,
            name: t.name,
            xp: 2,
            training: t.training,
            done: false,
            awarded: false,
          })),
      });
  }
}

// Legacy four-question notes remain readable without rewriting the original records.
export function diaryText(s: State, key: string) {
  const labels = [
    "这段时间精力如何？",
    "运动是否更加轻松？",
    "穿衣服的舒适度如何？",
    "最满意的一项进步是什么？",
  ];
  return s.reflections
    .filter((r) => r.date === key)
    .map(
      (r) =>
        r.text ??
        r.answers?.map((answer, i) => `${labels[i]}\n${answer}`).join("\n\n") ??
        "",
    )
    .join("\n\n");
}
export function saveDiary(
  s: State,
  key: string,
  text: string,
  today = dateKey(),
) {
  day.parse(key);
  if (key > today) throw new Error("不能提前记录未来的日记");
  const content = text.trim();
  if (!content) throw new Error("请先写一点日记内容");
  if (content.length > 20000) throw new Error("日记最多 20000 字");
  const existing = s.reflections.find((r) => r.date === key);
  s.reflections = s.reflections.filter((r) => r.date !== key);
  s.reflections.push({ id: existing?.id ?? uid(), date: key, text: content });
}

// Update only the untouched original defaults; historical snapshots keep their names and awards.
export function migrateDefaultTasks(s: State, today = dateKey()) {
  const names = [
    "好好吃饭，均衡一餐",
    "喝水 1,500 ml",
    "走路 10,000 步",
    "午夜前安心入睡",
    "完成适合自己的训练",
  ];
  const replacements = [
    "热量缺口300kcal",
    "喝水1500ml",
    "走路10000步",
    "12点前睡觉",
  ];
  const old = names.map((name) =>
    s.tasks.find(
      (t) =>
        t.name === name &&
        !t.archived &&
        t.created === s.started &&
        t.days.length === 7,
    ),
  );
  if (old.every((t) => t !== undefined)) {
    const training = old[4]!;
    training.archived = true;
    const plan = s.plans.find((p) => p.date === today);
    if (plan)
      plan.items = plan.items.filter(
        (i) => i.taskId !== training.id || i.done || i.awarded !== false,
      );
    old
      .slice(0, 4)
      .forEach((t, i) => saveTask(s, { ...t!, name: replacements[i] }, today));
    const ids = new Set(old.map((t) => t!.id));
    s.tasks = [
      ...old
        .slice(0, 4)
        .map((t) => s.tasks.find((current) => current.id === t!.id)!),
      ...s.tasks.filter((t) => !ids.has(t.id)),
      training,
    ];
    if (plan) {
      const order = new Map(s.tasks.map((t, i) => [t.id, i]));
      plan.items.sort(
        (a, b) => (order.get(a.taskId) ?? 99) - (order.get(b.taskId) ?? 99),
      );
    }
  }
  // Legacy task definitions may contain fixed values; awards live only in plan snapshots.
  s.tasks.forEach((t) => {
    t.xp = null;
  });
}
