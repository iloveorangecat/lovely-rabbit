import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, loadState, mutate, restore } from "./db";
import {
  complete,
  dateKey,
  diaryText,
  saveDiary,
  ensurePlan,
  fillPlans,
  initialState,
  migrateDefaultTasks,
  parseBackup,
  progress,
  redeem,
  saveTask,
  shiftDate,
  totals,
  validateState,
  type State,
} from "./model";
const today = dateKey();
function fixture() {
  const s = initialState(shiftDate(today, -7));
  s.tasks.forEach((t) => {
    t.xp = null;
    t.days = [0, 1, 2, 3, 4, 5, 6];
  });
  fillPlans(s, today);
  s.plans.forEach((p) =>
    p.items.forEach((i) => {
      i.xp = 6;
    }),
  );
  return s;
}
function earn(s: State) {
  s.plans.forEach((p) =>
    p.items.forEach((i) => {
      i.done = true;
      i.awarded = true;
    }),
  );
}

describe("积分 ledger and schedules", () => {
  beforeEach(() => {
    vi.spyOn(Math, "random").mockReturnValue(0.8);
  });
  it("one task can only be claimed once; undo and redo preserve the roll", () => {
    const s = fixture(),
      id = s.tasks[0].id;
    complete(s, today, id, true);
    complete(s, today, id, true);
    expect(totals(s)).toEqual({ lifetimeXP: 6, availableXP: 6 });
    complete(s, today, id, false);
    expect(totals(s).availableXP).toBe(0);
    complete(s, today, id, true);
    expect(totals(s).availableXP).toBe(6);
  });
  it("rolls random 积分 only on first completion and preserves it through undo", () => {
    const s = initialState();
    const random = vi.spyOn(Math, "random").mockReturnValue(0.8);
    try {
      const p = ensurePlan(s, today);
      expect(random).not.toHaveBeenCalled();
      const id = p.items[0].taskId;
      complete(s, today, id, true);
      expect(p.items[0].xp).toBe(6);
      expect(random).toHaveBeenCalledTimes(1);
      complete(s, today, id, false);
      complete(s, today, id, true);
      expect(p.items[0].xp).toBe(6);
      expect(random).toHaveBeenCalledTimes(1);
    } finally {
      random.mockRestore();
    }
  });
  it("keeps a legacy snapshot's 积分 without redrawing or changing the balance", () => {
    const s = fixture(),
      item = s.plans.find((p) => p.date === today)!.items[0];
    delete item.awarded;
    item.xp = 5;
    s.tasks[0].xp = null;
    complete(s, today, item.taskId, true);
    expect(totals(s).availableXP).toBe(5);
    complete(s, today, item.taskId, false);
    complete(s, today, item.taskId, true);
    expect(totals(s).availableXP).toBe(5);
  });
  it("allows last 3 days, rejects the fourth day and future", () => {
    const s = fixture();
    complete(s, shiftDate(today, -3), s.tasks[0].id, true);
    expect(totals(s).lifetimeXP).toBe(6);
    expect(() =>
      complete(s, shiftDate(today, -4), s.tasks[0].id, true),
    ).toThrow();
    expect(() => ensurePlan(s, shiftDate(today, 1))).toThrow();
  });
  it("training appears on scheduled days only", () => {
    const s = initialState(shiftDate(today, -7));
    const t = s.tasks[0];
    t.training = true;
    const weekday = new Date(`${today}T12:00:00`).getDay();
    t.days = [(weekday + 1) % 7];
    expect(ensurePlan(s, today).items.some((i) => i.training)).toBe(false);
  });
  it("redeeming spends balance but keeps lifetime 积分 and stage", () => {
    const s = fixture();
    earn(s);
    const before = totals(s),
      stage = progress(s).index;
    redeem(s, s.rewards[0].id);
    expect(totals(s)).toEqual({
      lifetimeXP: before.lifetimeXP,
      availableXP: before.availableXP - 66,
    });
    expect(progress(s).index).toBe(stage);
  });
  it("rejects insufficient funds and keeps balance nonnegative", () => {
    const s = fixture();
    expect(() => redeem(s, s.rewards[0].id)).toThrow();
    earn(s);
    while (totals(s).availableXP >= 66) redeem(s, s.rewards[0].id);
    expect(() => redeem(s, s.rewards[0].id)).toThrow();
    expect(totals(s).availableXP).toBeGreaterThanOrEqual(0);
  });
  it("prevents undo that would spend already redeemed 积分", () => {
    const s = fixture();
    s.rewards[0].cost = 6;
    complete(s, today, s.tasks[0].id, true);
    redeem(s, s.rewards[0].id);
    expect(() => complete(s, today, s.tasks[0].id, false)).toThrow();
    expect(totals(s).availableXP).toBe(0);
  });
  it("advances stage without redemption and keeps earlier rewards purchasable", () => {
    const s = fixture();
    earn(s);
    expect(progress(s).index).toBeGreaterThan(0);
    expect(s.redemptions).toHaveLength(0);
    expect(() => redeem(s, s.rewards[0].id)).not.toThrow();
  });
  it("enforces 8 tasks per weekday", () => {
    const s = fixture();
    for (let i = 0; i < 4; i++)
      saveTask(s, { ...s.tasks[0], id: `extra-${i}` });
    expect(() => saveTask(s, { ...s.tasks[0], id: "ninth" })).toThrow(/8/);
  });
  it("editing preserves historical 积分 and completed snapshots", () => {
    const s = fixture();
    complete(s, today, s.tasks[0].id, true);
    const old = structuredClone(s.plans);
    saveTask(s, { ...s.tasks[0], name: "changed", xp: 2 });
    expect(s.plans).toEqual(old);
  });
  it("fills missed dates and freezes previous schedules", () => {
    const s = initialState(shiftDate(today, -3));
    fillPlans(s, today);
    const old = structuredClone(s.plans[0]);
    saveTask(s, { ...s.tasks[0], name: "新名称", days: [1] });
    expect(s.plans[0]).toEqual(old);
    expect(s.plans).toHaveLength(4);
  });
});
describe("backup validation", () => {
  it("round-trips every data category", () => {
    const s = fixture();
    earn(s);
    redeem(s, s.rewards[0].id);
    s.weights.push({ date: today, kg: 50 });
    s.reflections.push({
      id: "r",
      date: today,
      answers: ["更好", "轻松", "舒适", "坚持"],
    });
    expect(parseBackup(JSON.stringify(s))).toEqual(s);
  });
  it("rejects unknown version, impossible dates, duplicated 积分 and broken references", () => {
    const s = fixture();
    expect(() => parseBackup("{")).toThrow();
    expect(() => validateState({ ...s, version: 99 })).toThrow();
    expect(() => validateState({ ...s, started: "2026-02-30" })).toThrow();
    expect(() => validateState({ ...s, started: "1000-01-01" })).toThrow();
    expect(() =>
      validateState({
        ...s,
        tasks: s.tasks.map((t) => ({ ...t, created: shiftDate(today, 1) })),
      }),
    ).toThrow();
    expect(() =>
      validateState({ ...s, plans: [...s.plans, s.plans[0]] }),
    ).toThrow();
    s.plans[0].items.push(s.plans[0].items[0]);
    expect(() => validateState(s)).toThrow();
  });
  it("rejects negative ledger and unsafe image URL", () => {
    const s = fixture();
    s.redemptions.push({
      id: "a",
      rewardId: s.rewards[0].id,
      name: "bad",
      cost: 100,
      date: today,
    });
    expect(() => validateState(s)).toThrow();
    const n = fixture();
    n.rewards[0].image = "javascript:alert(1)";
    expect(() => validateState(n)).toThrow();
  });
});
describe("IndexedDB transactions and recovery", () => {
  beforeEach(async () => {
    await db.states.clear();
    await loadState();
  });
  it("persists data across close and reopen", async () => {
    await mutate((d) => complete(d, today, d.tasks[0].id, true));
    const t = totals((await db.states.get("main"))!.data);
    db.close();
    await db.open();
    expect(totals(await loadState())).toEqual(t);
  });
  it("serializes concurrent duplicate completions", async () => {
    const s = await loadState();
    await Promise.all([
      mutate((d) => complete(d, today, s.tasks[0].id, true)),
      mutate((d) => complete(d, today, s.tasks[0].id, true)),
    ]);
    const saved = await loadState();
    expect(totals(saved).availableXP).toBe(saved.plans[0].items[0].xp);
    expect(saved.plans[0].items.filter((i) => i.done)).toHaveLength(1);
  });
  it("failed import and failed mutations leave old records intact", async () => {
    const old = await loadState();
    await expect(
      restore({ ...old, version: 99 } as unknown as State),
    ).rejects.toThrow();
    await expect(
      mutate((d) => {
        d.profile.nickname = "";
      }),
    ).rejects.toThrow();
    expect(await loadState()).toEqual(old);
  });
  it("restores a valid backup atomically", async () => {
    const s = fixture();
    earn(s);
    await restore(parseBackup(JSON.stringify(s)));
    expect(await loadState()).toEqual(s);
  });
});

describe("daily diary and old notes", () => {
  it("stores one plain diary per date and editing keeps the record id and 积分", () => {
    const s = fixture(),
      before = totals(s);
    saveDiary(s, today, "今天散步了。\n晚上很放松。");
    const id = s.reflections[0].id;
    expect(diaryText(s, today)).toBe("今天散步了。\n晚上很放松。");
    saveDiary(s, today, "更新后的日记");
    expect(s.reflections).toHaveLength(1);
    expect(s.reflections[0].id).toBe(id);
    expect(totals(s)).toEqual(before);
    expect(parseBackup(JSON.stringify(s))).toEqual(s);
  });
  it("separates dates and permits older diary entries without reopening old habit records", () => {
    const s = fixture(),
      old = shiftDate(today, -5);
    saveDiary(s, old, "以前的日记");
    saveDiary(s, today, "今天的日记");
    expect(diaryText(s, old)).toBe("以前的日记");
    expect(diaryText(s, today)).toBe("今天的日记");
    expect(() => complete(s, old, s.tasks[0].id, true)).toThrow();
  });
  it("reads every old answer as plain text without rewriting or dropping original notes", () => {
    const s = fixture();
    s.reflections.push(
      {
        id: "old-a",
        date: today,
        answers: ["精力变好", "运动轻松", "衣服舒适", "坚持散步"],
      },
      {
        id: "old-b",
        date: today,
        answers: ["另一次记录", "第二段", "第三段", "第四段"],
      },
    );
    const before = structuredClone(s);
    const text = diaryText(s, today);
    for (const answer of s.reflections.flatMap((r) => r.answers ?? []))
      expect(text).toContain(answer);
    expect(s).toEqual(before);
    saveDiary(s, today, text + "\n今天的补充");
    expect(s.reflections).toHaveLength(1);
    expect(diaryText(s, today)).toContain("另一次记录");
    expect(diaryText(s, today)).toContain("今天的补充");
  });
  it("rejects invalid, empty and future diaries before persistence", () => {
    const s = fixture();
    expect(() => saveDiary(s, today, "   ")).toThrow();
    expect(() => saveDiary(s, "2026-02-30", "文字")).toThrow();
    expect(() => saveDiary(s, shiftDate(today, 1), "文字")).toThrow();
    expect(s.reflections).toHaveLength(0);
  });
  it("persists diary text across IndexedDB restart and backup recovery", async () => {
    await db.states.clear();
    await loadState();
    await mutate((d) => saveDiary(d, today, "记下今天的小事"));
    const backup = JSON.stringify(await loadState());
    db.close();
    await db.open();
    expect(diaryText(await loadState(), today)).toBe("记下今天的小事");
    await restore(initialState());
    await restore(parseBackup(backup));
    expect(diaryText(await loadState(), today)).toBe("记下今天的小事");
  });
});

describe("four defaults and migration", () => {
  it("uses four daily random tasks and normalizes attempted fixed scores", () => {
    const s = initialState();
    expect(s.tasks.map((t) => t.name)).toEqual([
      "热量缺口300kcal",
      "喝水1500ml",
      "走路10000步",
      "12点前睡觉",
    ]);
    expect(s.tasks.every((t) => t.xp === null && !t.training)).toBe(true);
    ensurePlan(s, today);
    saveTask(s, { ...s.tasks[0], xp: 6 });
    expect(s.tasks[0].xp).toBeNull();
    const random = vi.spyOn(Math, "random").mockReturnValue(0);
    complete(s, today, s.tasks[0].id, true);
    expect(totals(s).availableXP).toBe(2);
    random.mockRestore();
  });
  it("migrates untouched defaults once, preserving historical and awarded snapshots", () => {
    const s = initialState(shiftDate(today, -1));
    const names = [
      "好好吃饭，均衡一餐",
      "午夜前安心入睡",
      "走路 10,000 步",
      "喝水 1,500 ml",
      "完成适合自己的训练",
    ];
    s.tasks = names.map((name, i) => ({
      ...s.tasks[0],
      id: `old-${i}`,
      name,
      training: i === 4,
    }));
    fillPlans(s, today);
    const yesterday = structuredClone(s.plans[0]);
    const item = s.plans[1].items[0];
    item.done = true;
    item.awarded = true;
    item.xp = 5;
    const completed = structuredClone(item);
    migrateDefaultTasks(s, today);
    expect(s.tasks.filter((t) => !t.archived)).toHaveLength(4);
    expect(s.tasks.filter((t) => !t.archived).map((t) => t.name)).toEqual(
      initialState().tasks.map((t) => t.name),
    );
    expect(s.plans[0]).toEqual(yesterday);
    expect(s.plans[1].items).toHaveLength(4);
    expect(s.plans[1].items[0]).toEqual(completed);
    expect(totals(s).lifetimeXP).toBe(5);
    const after = structuredClone(s);
    migrateDefaultTasks(s, today);
    expect(s).toEqual(after);
  });
  it("leaves custom names and schedules untouched", () => {
    const s = initialState();
    s.tasks[0].name = "我的习惯";
    s.tasks[0].days = [1];
    const before = structuredClone(s);
    migrateDefaultTasks(s, today);
    expect(s).toEqual(before);
  });
});
