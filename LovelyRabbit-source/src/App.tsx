import { GrowthTrail, WishAxis } from "./components/GrowthTrail";
import { BalletBow } from "./components/BalletBow";
import { BalletLace } from "./components/BalletTrim";
import { liveQuery } from "dexie";
import {
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Check,
  Download,
  Flower2,
  Gem,
  Gift,
  Heart,
  Home,
  Pencil,
  Plus,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ZodError } from "zod";
import { BackupText, PasteBackup } from "./components/BackupText";
import { Modal, PageTitle, Section } from "./components/common";
import { Onboarding, RewardForm, TaskForm } from "./components/editors";
import { TaskList } from "./components/TaskList";
import { weekNames } from "./constants";
import { db, loadState, mutate, restore } from "./db";
import {
  complete,
  diaryText,
  saveDiary,
  dateKey,
  ensurePlan,
  fillPlans,
  initialState,
  parseBackup,
  progress,
  redeem,
  saveTask,
  shiftDate,
  stages,
  thresholds,
  totals,
  uid,
  validateState,
  type Reward,
  type State,
  type Task,
} from "./model";
import { DiaryForm } from "./components/DiaryForm";
import { FoodSheet } from "./components/FoodSheet";
import { ExerciseSheet } from "./components/ExerciseSheet";
import { MetabolicForm } from "./components/MetabolicForm";
import { MealRecords } from "./components/MealRecords";
import {
  basalEstimate,
  intakeFor,
  formatKcal,
  mealNames,
  saveMeal,
  saveExercise,
  rememberFood,
  rememberExercise,
  type ExerciseEntry,
  type MealEntry,
} from "./nutrition";
export default function App() {
  const [s, setS] = useState<State>();
  const [error, setError] = useState("");
  const [today, setToday] = useState(dateKey());
  const [tab, setTab] = useState("首页");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [checkFeedback, setCheckFeedback] = useState<{
    id: string;
    done: boolean;
    xp: number;
  } | null>(null);
  useEffect(() => {
    if (!checkFeedback) return;
    const timer = setTimeout(() => setCheckFeedback(null), 1900);
    return () => clearTimeout(timer);
  }, [checkFeedback]);
  const [modal, setModal] = useState<ReactNode>(null);
  const [taskEdit, setTaskEdit] = useState<Task | null | undefined>();
  const [rewardEdit, setRewardEdit] = useState<Reward | null | undefined>();
  const [selected, setSelected] = useState(dateKey());
  const [month, setMonth] = useState(dateKey().slice(0, 7));
  const [storage, setStorage] = useState(false);
  const [foodEdit, setFoodEdit] = useState<{
    date: string;
    meal: (typeof mealNames)[number];
    entry?: MealEntry;
  } | null>(null);
  const [metabolicOpen, setMetabolicOpen] = useState(false);
  const [exerciseEdit, setExerciseEdit] = useState<{
    date: string;
    entry?: ExerciseEntry;
  } | null>(null);
  const notify = (v: string) => setToast(v);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3800);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    let alive = true;
    loadState()
      .then(() =>
        mutate((d) => {
          ensurePlan(d, dateKey());
          if (d.profile.nickname === "小美") d.profile.nickname = "兔兔";
        }),
      )
      .catch((e) => alive && setError(String(e)));
    const sub = liveQuery(() => db.states.get("main")).subscribe({
      next: (row) => {
        if (alive && row) {
          try {
            setS(validateState(row.data));
          } catch (e) {
            setError(String(e));
          }
        }
      },
      error: (e) => setError(String(e)),
    });
    const interval = setInterval(() => setToday(dateKey()), 15000);
    const onFocus = () => setToday(dateKey());
    window.addEventListener("focus", onFocus);
    navigator.storage
      ?.persisted?.()
      .then((v) => alive && setStorage(v))
      .catch(() => {
        if (alive) setStorage(false);
      });
    return () => {
      alive = false;
      sub.unsubscribe();
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);
  useEffect(() => {
    if (s && !s.plans.some((p) => p.date === today))
      mutate((d) => {
        fillPlans(d, today);
      }).catch((e) => notify(e.message));
  }, [today, s]);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", s?.profile.dark ?? false);
  }, [s?.profile.dark]);
  const run = async (fn: (d: State) => void, message?: string) => {
    setBusy(true);
    try {
      const next = await mutate(fn);
      if (message) notify(message);
      setS(next);
      return true;
    } catch (e) {
      notify(
        e instanceof ZodError
          ? "填写内容不符合要求，请检查名称、积分和执行日期"
          : e instanceof Error
            ? e.message
            : "保存失败，请检查设备存储空间",
      );
      return false;
    } finally {
      setBusy(false);
    }
  };
  const confirm = (
    title: string,
    content: string,
    action: () => Promise<unknown>,
    danger = false,
  ) =>
    setModal(
      <Modal title={title} onClose={() => setModal(null)}>
        <p className="confirm-copy">{content}</p>
        <button
          className={`primary wide ${danger ? "danger" : ""}`}
          onClick={() => {
            setModal(null);
            void action();
          }}
        >
          确认{danger ? "继续" : ""}
        </button>
        <button className="secondary wide" onClick={() => setModal(null)}>
          再想一想
        </button>
      </Modal>,
    );
  const toggle = async (key: string, id: string, done: boolean) => {
    setCheckFeedback(null);
    setToast("");
    let change = 0;
    const ok = await run((d) => {
      const before = totals(d).lifetimeXP;
      complete(d, key, id, done);
      change = totals(d).lifetimeXP - before;
    }, undefined);
    if (ok && change !== 0) {
      setToast("");
      setCheckFeedback({ id: uid(), done, xp: Math.abs(change) });
    }
  };
  if (error)
    return (
      <main className="fatal">
        <ShieldCheck size={40} />
        <h1>本地手账暂时无法读取</h1>
        <p>
          请允许浏览器使用 IndexedDB，检查可用空间后重试。现有记录未被清空。
        </p>
        <pre>{error}</pre>
        <button className="primary" onClick={() => location.reload()}>
          重新打开
        </button>
      </main>
    );
  if (!s)
    return (
      <main className="fatal">
        <Flower2 size={42} />
        <p>正在打开你的成长手账…</p>
      </main>
    );
  const total = totals(s),
    p = progress(s),
    plan = s.plans.find((p) => p.date === today),
    done = plan?.items.filter((i) => i.done).length ?? 0,
    stageList = stages(s),
    nextReward = stageList[p.index];
  const latestWeight = [...s.weights]
    .filter((w) => w.date <= today)
    .sort((a, b) => b.date.localeCompare(a.date))[0]?.kg;
  const basal = s.nutrition.profile
    ? basalEstimate(
        s.nutrition.profile,
        latestWeight ?? s.nutrition.profile.weightKg,
      )
    : null;
  const hasIntake = s.nutrition.meals.some((m) => m.date === today);
  const difference =
    basal === null || !hasIntake
      ? null
      : Math.round(basal - intakeFor(s.nutrition, today));
  const go = (t: string) => {
    setCheckFeedback(null);
    setTab(t);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const openDate = async (key: string) => {
    setSelected(key);
    if (key >= shiftDate(today, -3) && key <= today && key >= s.started)
      await run((d) => {
        ensurePlan(d, key);
      });
  };
  const weightModal = () =>
    setModal(
      <Modal title="体重记录" onClose={() => setModal(null)}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const kg =
              Number(f.get("weight")) / (s.profile.unit === "斤" ? 2 : 1);
            void run((d) => {
              d.weights = d.weights.filter((w) => w.date !== today);
              d.weights.push({ date: today, kg });
            }, "已记录，好好照顾身体就很好").then((ok) => ok && setModal(null));
          }}
        >
          <label>
            今日体重（{s.profile.unit}）
            <input
              name="weight"
              type="number"
              required
              step="0.1"
              min={s.profile.unit === "斤" ? 40 : 20}
              max={s.profile.unit === "斤" ? 600 : 300}
              defaultValue={
                s.weights.find((w) => w.date === today)
                  ? s.weights.find((w) => w.date === today)!.kg *
                    (s.profile.unit === "斤" ? 2 : 1)
                  : undefined
              }
            />
          </label>
          <button className="primary wide" disabled={busy}>
            保存记录
          </button>
        </form>
      </Modal>,
    );
  const diaryModal = (key = today) =>
    setModal(
      <Modal title={`${key} 的日记`} onClose={() => setModal(null)}>
        <DiaryForm
          date={key}
          initialText={diaryText(s, key)}
          onSave={async (text) => {
            const ok = await run((d) => saveDiary(d, key, text), "日记已保存");
            if (ok) setModal(null);
            return ok;
          }}
        />
      </Modal>,
    );
  return (
    <div className="app-shell">
      <div className="phone-shell">
        <header className="topbar">
          <button className="brand" onClick={() => go("首页")}>
            <BalletBow />
            <span>
              兔兔要减肥<small>lovely rabbit</small>
            </span>
          </button>
        </header>
        <main className="main-content">
          {tab === "首页" && (
            <>
              <div className="greeting">
                <p className="eyebrow">
                  {new Date(`${today}T12:00:00`).toLocaleDateString("zh-CN", {
                    month: "long",
                    day: "numeric",
                    weekday: "long",
                  })}
                </p>
                <h1>
                  你好，
                  <button
                    className="nickname-button"
                    onClick={() =>
                      setModal(
                        <Modal title="修改昵称" onClose={() => setModal(null)}>
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              const f = new FormData(e.currentTarget);
                              void run((d) => {
                                d.profile.nickname = String(
                                  f.get("nickname"),
                                ).trim();
                              }, "昵称已保存").then(
                                (ok) => ok && setModal(null),
                              );
                            }}
                          >
                            <label>
                              昵称
                              <input
                                name="nickname"
                                aria-label="新的昵称"
                                defaultValue={s.profile.nickname}
                                required
                                maxLength={30}
                              />
                            </label>
                            <button className="primary wide">保存昵称</button>
                          </form>
                        </Modal>,
                      )
                    }
                    aria-label="修改昵称"
                  >
                    {s.profile.nickname}
                  </button>
                  <Sparkles size={23} strokeWidth={1.4} />
                </h1>
              </div>
              <div className="rabbit-hero">
                <img
                  className="rabbit-mascot"
                  src={`${import.meta.env.BASE_URL}rabbit-mascot.webp`}
                  alt=""
                  aria-hidden="true"
                  fetchPriority="high"
                  width="800"
                  height="800"
                />
                <section className="hero-card wish-progress-card nutrition-hero">
                  <div className="wish-overview">
                    <span className="hero-wish-label">
                      <Gift size={14} />
                      下一个心愿
                    </span>
                    <BalletBow className="hero-ribbon" />
                    <h2 className="hero-wish-title">
                      {nextReward?.name ?? "阶段心愿已全部解锁"}
                    </h2>
                    <div className="hero-point-pair">
                      <div>
                        <span>已获积分</span>
                        <strong>
                          {total.lifetimeXP}
                          <small>积分</small>
                        </strong>
                      </div>
                      <div>
                        <span>所需积分</span>
                        <strong>
                          {nextReward?.cost ?? "—"}
                          <small>积分</small>
                        </strong>
                      </div>
                    </div>
                    <div
                      className="progress-track"
                      role="progressbar"
                      aria-label="下一份心愿进度"
                      aria-valuemin={0}
                      aria-valuemax={
                        nextReward?.cost ?? Math.max(1, total.lifetimeXP)
                      }
                      aria-valuenow={
                        nextReward
                          ? Math.min(total.lifetimeXP, nextReward.cost)
                          : Math.max(1, total.lifetimeXP)
                      }
                    >
                      <div
                        style={{
                          width: `${nextReward ? Math.min(100, (total.lifetimeXP / nextReward.cost) * 100) : 100}%`,
                        }}
                      />
                    </div>
                    <div className="hero-progress-caption">
                      <span>
                        {nextReward
                          ? `还差 ${Math.max(0, nextReward.cost - total.lifetimeXP)} 积分`
                          : "全部心愿已达标"}
                      </span>
                      <span className="available-caption">
                        可用{" "}
                        <span className="xp-number">
                          {total.availableXP}
                          <span>积分</span>
                        </span>
                      </span>
                    </div>
                  </div>
                  <div className="nutrition-shortcuts">
                    {(
                      [
                        "早餐",
                        "午餐",
                        "晚餐",
                        "运动",
                        "加餐",
                        "热量缺口",
                      ] as const
                    ).map((label) =>
                      label === "运动" ? (
                        <button
                          key={label}
                          className="nutrition-shortcut"
                          onClick={() => setExerciseEdit({ date: today })}
                          aria-label="运动记录"
                        >
                          <span>运动</span>
                          <small>
                            {s.nutrition.exercises.some(
                              (e) => e.date === today,
                            ) ? (
                              `${formatKcal(s.nutrition.exercises.filter((e) => e.date === today).reduce((sum, e) => sum + e.kcal, 0))} 千卡`
                            ) : (
                              <Plus size={17} aria-hidden="true" />
                            )}
                          </small>
                        </button>
                      ) : label === "热量缺口" ? (
                        <button
                          key={label}
                          className="nutrition-shortcut gap-shortcut"
                          onClick={() => setMetabolicOpen(true)}
                          aria-label="热量缺口与代谢资料"
                        >
                          <span>热量缺口</span>
                          <strong>
                            {difference === null
                              ? "—"
                              : `${difference > 0 ? "+" : ""}${formatKcal(difference)}`}
                          </strong>
                        </button>
                      ) : (
                        <button
                          key={label}
                          className="nutrition-shortcut"
                          aria-label={`${label}记录`}
                          onClick={() =>
                            setFoodEdit({ date: today, meal: label })
                          }
                        >
                          <span>{label}</span>
                          <small>
                            {s.nutrition.meals.some(
                              (m) => m.date === today && m.meal === label,
                            ) ? (
                              `${formatKcal(intakeFor(s.nutrition, today, label))} 千卡`
                            ) : (
                              <Plus size={17} aria-hidden="true" />
                            )}
                          </small>
                        </button>
                      ),
                    )}
                  </div>
                  <div className="hero-bottom weight-pair nutrition-weight-row">
                    <div>
                      <span>目标体重</span>
                      <strong>
                        {s.profile.targetKg * (s.profile.unit === "斤" ? 2 : 1)}{" "}
                        {s.profile.unit}
                      </strong>
                    </div>
                    <div>
                      <span>当前体重</span>
                      <strong>
                        {latestWeight
                          ? `${(latestWeight * (s.profile.unit === "斤" ? 2 : 1)).toFixed(1)} ${s.profile.unit}`
                          : "未记录"}
                      </strong>
                    </div>
                    <button
                      className="weight-record-button hero-weight-button"
                      onClick={weightModal}
                    >
                      记录体重
                    </button>
                  </div>
                </section>
              </div>
              <Section
                title="今日任务"
                action={
                  <span className="count-badge">
                    {done} / {plan?.items.length ?? 0} 完成
                  </span>
                }
              />
              <TaskList
                plan={plan}
                editable
                busy={busy}
                onToggle={(id, d) => toggle(today, id, d)}
              />
              <button className="add-task" onClick={() => setTaskEdit(null)}>
                <Plus size={17} />
                添加一个小目标
              </button>
              {new Date(`${today}T12:00:00`).getDay() === 1 &&
                !s.weights.some((w) => w.date === today) && (
                  <button className="reminder" onClick={weightModal}>
                    <Heart size={20} />
                    <span>
                      周一，和身体打个招呼
                      <small>可选：更新本周体重，不影响积分</small>
                    </span>
                    <ChevronRight size={18} />
                  </button>
                )}
              <button
                className="reminder lavender"
                onClick={() => diaryModal(today)}
              >
                <BookOpen size={21} />
                <span>写今天的日记</span>
                <ChevronRight size={18} />
                <BalletBow className="diary-ribbon" />
              </button>
            </>
          )}
          {tab === "日历" && (
            <>
              <div className="calendar-title-row">
                <PageTitle eyebrow="MOMENTS OF GROWTH" title="日历" text="" />
                <button className="trail-entry" onClick={() => go("成长轨迹")}>
                  成长轨迹
                  <ChevronRight size={15} />
                </button>
              </div>
              <section className="panel ballet-calendar">
                <BalletLace />
                <div className="calendar-head">
                  <button
                    className="icon-button"
                    aria-label="上个月"
                    onClick={() => setMonth(shiftMonth(month, -1))}
                  >
                    <ChevronLeft />
                  </button>
                  <h2>{month.replace("-", " 年 ")} 月</h2>
                  <button
                    className="icon-button"
                    aria-label="下个月"
                    onClick={() => setMonth(shiftMonth(month, 1))}
                  >
                    <ChevronRight />
                  </button>
                </div>
                <div className="calendar-grid">
                  {weekNames.map((n) => (
                    <span className="weekday" key={n}>
                      {n}
                    </span>
                  ))}
                  {Array.from(
                    { length: new Date(`${month}-01T12:00:00`).getDay() },
                    (_, i) => (
                      <span key={`blank${i}`} />
                    ),
                  )}
                  {Array.from(
                    {
                      length: new Date(
                        Number(month.slice(0, 4)),
                        Number(month.slice(5)),
                        0,
                      ).getDate(),
                    },
                    (_, i) => {
                      const key = `${month}-${String(i + 1).padStart(2, "0")}`;
                      const xp =
                        s.plans
                          .find((p) => p.date === key)
                          ?.items.filter((i) => i.done)
                          .reduce((n, i) => n + i.xp, 0) ?? 0;
                      return (
                        <button
                          key={key}
                          className={`calendar-day ${selected === key ? "selected" : ""} ${key === today ? "today" : ""}`}
                          onClick={() => void openDate(key)}
                          aria-label={`${key}，${xp} 积分${s.reflections.some((r) => r.date === key) ? "，有日记" : ""}${s.nutrition.meals.some((m) => m.date === key) ? "，有饮食" : ""}${s.nutrition.exercises.some((m) => m.date === key) ? "，有运动" : ""}`}
                        >
                          <span>{i + 1}</span>
                          <span className="calendar-marks">
                            <i className={xp ? "active" : ""} />
                            {s.reflections.some((r) => r.date === key) && (
                              <i className="has-diary" />
                            )}
                            {s.nutrition.meals.some((m) => m.date === key) && (
                              <i className="has-meal" />
                            )}
                            {s.nutrition.exercises.some(
                              (m) => m.date === key,
                            ) && <i className="has-exercise" />}
                          </span>
                        </button>
                      );
                    },
                  )}
                </div>
                <div className="calendar-legend">
                  <i /> 打卡 <i className="diary-legend-dot" /> 日记{" "}
                  <i className="has-meal" />
                  饮食
                  <i className="has-exercise" /> 运动
                  <button
                    className="text-button"
                    onClick={() => {
                      setMonth(today.slice(0, 7));
                      void openDate(today);
                    }}
                  >
                    回到今天
                  </button>
                </div>
              </section>
              <Section
                title={
                  selected === today
                    ? "今天的记录"
                    : `${selected.slice(5).replace("-", " 月 ")} 日的记录`
                }
                action={
                  selected >= s.started &&
                  selected >= shiftDate(today, -3) &&
                  selected <= today &&
                  s.plans
                    .find((p) => p.date === selected)
                    ?.items.some((i) => !i.done) ? (
                    <button
                      className="text-button"
                      onClick={() =>
                        setModal(
                          <Modal
                            title="补录打卡"
                            onClose={() => setModal(null)}
                          >
                            <TaskList
                              plan={{
                                date: selected,
                                items: s.plans
                                  .find((p) => p.date === selected)!
                                  .items.filter((i) => !i.done),
                              }}
                              editable
                              busy={busy}
                              onToggle={(id, done) => {
                                setModal(null);
                                void toggle(selected, id, done);
                              }}
                            />
                          </Modal>,
                        )
                      }
                    >
                      补录打卡
                    </button>
                  ) : undefined
                }
              />
              <TaskList
                completedOnly
                plan={s.plans.find((p) => p.date === selected)}
                editable={selected >= shiftDate(today, -3) && selected <= today}
                busy={busy}
                onToggle={(id, d) => toggle(selected, id, d)}
              />
              <Section
                title={selected === today ? "今日饮食" : "当日饮食"}
                action={
                  selected <= today ? (
                    <div className="calendar-record-buttons">
                      <button
                        className="text-button"
                        onClick={() => setExerciseEdit({ date: selected })}
                      >
                        <Plus size={15} />
                        记录运动
                      </button>
                      <button
                        className="text-button"
                        onClick={() =>
                          setFoodEdit({ date: selected, meal: "早餐" })
                        }
                      >
                        <Plus size={15} />
                        记录饮食
                      </button>
                    </div>
                  ) : undefined
                }
              />
              <MealRecords
                nutrition={s.nutrition}
                date={selected}
                onEditExercise={(entry) =>
                  setExerciseEdit({ date: selected, entry })
                }
                onEdit={(entry) =>
                  setFoodEdit({ date: selected, meal: entry.meal, entry })
                }
                onDelete={(id) =>
                  confirm(
                    "删除这条饮食记录？",
                    "当天已记录热量将重新计算，任务积分不变。",
                    () =>
                      run((d) => {
                        d.nutrition.meals = d.nutrition.meals.filter(
                          (m) => m.id !== id,
                        );
                      }, "饮食记录已删除"),
                  )
                }
                onDeleteExercise={(id) =>
                  confirm(
                    "删除这条运动记录？",
                    "只移除该条运动记录，不影响任务积分。",
                    () =>
                      run((d) => {
                        d.nutrition.exercises = d.nutrition.exercises.filter(
                          (m) => m.id !== id,
                        );
                      }, "运动记录已删除"),
                  )
                }
              />
              <Section
                title="这一天的日记"
                sub={selected}
                action={
                  selected <= today ? (
                    <button
                      className="text-button"
                      onClick={() => diaryModal(selected)}
                    >
                      <Pencil size={14} />
                      {diaryText(s, selected) ? "编辑日记" : "写日记"}
                    </button>
                  ) : undefined
                }
              />
              <section
                className="panel diary-entry"
                aria-label={`${selected} 的日记`}
              >
                {diaryText(s, selected) ? (
                  <p className="diary-content">{diaryText(s, selected)}</p>
                ) : (
                  <p className="diary-empty">
                    {selected > today ? "还没到这一天" : "这一天还没有日记。"}
                  </p>
                )}
              </section>
            </>
          )}
          {tab === "奖励" && (
            <>
              <PageTitle eyebrow="" title="心愿商店" text="" />
              <div className="balance-strip">
                <Gem size={21} />
                <span>可用积分</span>
                <strong>
                  {total.availableXP}
                  <small> 积分</small>
                </strong>
              </div>
              <WishAxis state={s} />
              <Section
                title="我的心愿清单"
                action={
                  <button
                    className="round-button"
                    aria-label="新增奖励"
                    onClick={() => setRewardEdit(null)}
                  >
                    <Plus size={19} />
                  </button>
                }
              />
              <div className="rewards-grid">
                {[...s.rewards]
                  .sort((a, b) => a.cost - b.cost)
                  .map((r, i) => {
                    const unlocked = total.lifetimeXP >= r.cost,
                      afford = total.availableXP >= r.cost;
                    return (
                      <article className="reward-card" key={r.id}>
                        <div className={`reward-art tone-${i % 4}`}>
                          <span className="art-orbit" />
                          <Gift
                            className="reward-gift"
                            size={43}
                            strokeWidth={1.1}
                            aria-hidden="true"
                          />
                          <BalletBow className="reward-ribbon" />
                          <BalletLace />
                          <button
                            className="edit-reward"
                            aria-label={`编辑 ${r.name}`}
                            onClick={() => setRewardEdit(r)}
                          >
                            <Pencil size={14} />
                          </button>
                        </div>
                        <div className="reward-body">
                          <h3>{r.name}</h3>
                          <div className="reward-price">
                            <Gem size={13} />
                            {r.cost}
                            <span>积分</span>
                          </div>
                          <button
                            disabled={busy || !unlocked || !afford}
                            onClick={() =>
                              confirm(
                                "兑换这份小确幸？",
                                `「${r.name}」将花费 ${r.cost} 积分。兑换后余额为 ${total.availableXP - r.cost} 积分，累计获得的积分不变。`,
                                () =>
                                  run(
                                    (d) => redeem(d, r.id),
                                    "心愿已兑换，记得好好享受这份奖励",
                                  ),
                              )
                            }
                          >
                            {!unlocked
                              ? "等待成长解锁"
                              : !afford
                                ? "再收藏一点 积分"
                                : "兑换心愿"}
                          </button>
                        </div>
                      </article>
                    );
                  })}
              </div>
              <Section title="兑换足迹" />
              {!s.redemptions.length ? (
                <div className="empty redemption-empty">
                  暂无兑换记录，快去打卡吧~
                </div>
              ) : (
                <div className="panel">
                  {[...s.redemptions].reverse().map((r) => (
                    <div className="history-row" key={r.id}>
                      <span className="small-icon">
                        <Gift size={19} />
                      </span>
                      <span>
                        <strong>{r.name}</strong>
                        <small>{r.date}</small>
                      </span>
                      <em>−{r.cost} 积分</em>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          {tab === "成长轨迹" && (
            <>
              <button className="text-button" onClick={() => go("日历")}>
                <ChevronLeft size={16} />
                返回日历
              </button>
              <GrowthTrail state={s} today={today} onWeight={weightModal} />
            </>
          )}
          {tab === "设置" && (
            <>
              <section className="panel settings-about">
                <Section title="关于我" />
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    void run((d) => {
                      d.profile.nickname = String(f.get("nickname")).trim();
                      d.profile.targetKg =
                        Number(f.get("target")) /
                        (d.profile.unit === "斤" ? 2 : 1);
                    }, "个人设置已保存");
                  }}
                >
                  <label>
                    昵称
                    <input
                      name="nickname"
                      defaultValue={s.profile.nickname}
                      required
                      maxLength={30}
                    />
                  </label>
                  <div className="form-row">
                    <label>
                      目标体重
                      <input
                        key={s.profile.unit}
                        name="target"
                        type="number"
                        required
                        min={s.profile.unit === "斤" ? 40 : 20}
                        max={s.profile.unit === "斤" ? 600 : 300}
                        step="0.1"
                        defaultValue={
                          s.profile.targetKg * (s.profile.unit === "斤" ? 2 : 1)
                        }
                      />
                    </label>
                    <label>
                      单位
                      <select
                        value={s.profile.unit}
                        onChange={(e) => {
                          const unit = e.currentTarget.value as "kg" | "斤";
                          void run((d) => {
                            d.profile.unit = unit;
                          });
                        }}
                      >
                        <option>斤</option>
                        <option>kg</option>
                      </select>
                    </label>
                  </div>
                  <button className="secondary wide" disabled={busy}>
                    保存个人设置
                  </button>
                </form>
              </section>
              <Section
                title="日常任务"
                action={
                  <button
                    className="round-button"
                    aria-label="新建任务"
                    onClick={() => setTaskEdit(null)}
                  >
                    <Plus size={19} />
                  </button>
                }
              />
              <section className="panel">
                {s.tasks
                  .filter((t) => !t.archived)
                  .map((t) => (
                    <div className="manage-row" key={t.id}>
                      <span>
                        <strong>{t.name}</strong>
                        <small>
                          {t.days.length === 7
                            ? "每天"
                            : t.days
                                .slice()
                                .sort()
                                .map((d) => `周${weekNames[d]}`)
                                .join("、")}{" "}
                          · 随机 2–6 积分
                        </small>
                      </span>
                      <button
                        className="icon-button"
                        aria-label={`编辑任务 ${t.name}`}
                        onClick={() => setTaskEdit(t)}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label={`删除任务 ${t.name}`}
                        onClick={() =>
                          confirm(
                            "移除这个任务？",
                            "历史打卡和已获得的积分会保留。今天未完成的该任务也会移除。",
                            () =>
                              run((d) => {
                                d.tasks.find((x) => x.id === t.id)!.archived =
                                  true;
                                const p = d.plans.find((p) => p.date === today);
                                if (p)
                                  p.items = p.items.filter(
                                    (i) => i.taskId !== t.id || i.done,
                                  );
                              }, "任务已移除"),
                          )
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
              </section>
              <Section title="数据与安心" />
              <button
                className="setting-row panel"
                onClick={() => setMetabolicOpen(true)}
              >
                <Heart size={20} />
                代谢资料与计算说明
                <ChevronRight size={17} />
              </button>
              <section className="panel">
                <button
                  className="setting-row"
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(s, null, 2)], {
                      type: "application/json",
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `LovelyRabbit-${today}.json`;
                    document.body.append(a);
                    a.click();
                    a.remove();
                    setTimeout(() => URL.revokeObjectURL(url), 60000);
                    notify("下载已发起，请检查下载列表；也可查看并复制备份");
                  }}
                >
                  <Download size={20} />
                  导出 JSON 备份
                  <ChevronRight size={17} />
                </button>
                <button
                  className="setting-row"
                  onClick={() =>
                    setModal(
                      <Modal
                        title="查看与复制备份"
                        onClose={() => setModal(null)}
                      >
                        <BackupText
                          value={JSON.stringify(s, null, 2)}
                          onNotify={notify}
                        />
                      </Modal>,
                    )
                  }
                >
                  <BookOpen size={20} />
                  查看与复制完整备份
                  <ChevronRight size={17} />
                </button>
                <button
                  className="setting-row"
                  onClick={() =>
                    setModal(
                      <Modal
                        title="粘贴备份恢复"
                        onClose={() => setModal(null)}
                      >
                        <PasteBackup
                          onNotify={notify}
                          onImport={(data) => {
                            confirm(
                              "用备份恢复手账？",
                              `备份含 ${data.plans.length} 天记录、${totals(data).lifetimeXP} 积分。将完整替换当前数据，建议先导出当前备份。`,
                              async () => {
                                setBusy(true);
                                try {
                                  await restore(data);
                                  notify("备份已完整恢复");
                                } catch {
                                  notify("恢复失败，原有数据未更改");
                                } finally {
                                  setBusy(false);
                                }
                              },
                            );
                          }}
                        />
                      </Modal>,
                    )
                  }
                >
                  <Upload size={20} />
                  粘贴 JSON 恢复
                  <ChevronRight size={17} />
                </button>
                <label className="setting-row file-row">
                  <Upload size={20} />
                  导入并恢复备份
                  <ChevronRight size={17} />
                  <input
                    aria-label="导入 JSON 备份"
                    type="file"
                    accept=".json,application/json"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (!f) return;
                      try {
                        if (f.size > 15000000)
                          throw new Error("备份不能超过 15MB");
                        const data = parseBackup(await f.text());
                        confirm(
                          "用备份恢复手账？",
                          `备份含 ${data.plans.length} 天记录、${totals(data).lifetimeXP} 积分。将完整替换当前数据，建议先导出当前备份。`,
                          async () => {
                            setBusy(true);
                            try {
                              await restore(data);
                              notify("备份已完整恢复");
                            } catch {
                              notify("恢复失败，原有数据未更改");
                            } finally {
                              setBusy(false);
                            }
                          },
                        );
                      } catch {
                        notify(
                          "备份格式、版本或积分记录不正确，原有数据未更改",
                        );
                      }
                    }}
                  />
                </label>
                <button
                  className="setting-row"
                  onClick={async () => {
                    if (!navigator.storage?.persist) {
                      notify("当前浏览器不支持持久存储保护，请定期导出备份");
                      return;
                    }
                    try {
                      const ok = await navigator.storage.persist();
                      setStorage(ok);
                      notify(
                        ok
                          ? "浏览器已授予持久存储保护"
                          : "浏览器未授予保护，请定期导出 JSON 备份",
                      );
                    } catch {
                      notify("无法申请持久存储保护，请定期导出备份");
                    }
                  }}
                >
                  <ShieldCheck size={20} />
                  {storage ? "持久存储保护已开启" : "请求浏览器持久存储保护"}
                  <ChevronRight size={17} />
                </button>
                <button
                  className="setting-row danger-text"
                  onClick={() =>
                    confirm(
                      "清空全部数据 · 第一次确认",
                      "即将删除任务、积分、心愿和所有记录。请先导出备份。",
                      async () => {
                        setModal(
                          <Modal
                            title="最后确认：永久清空"
                            onClose={() => setModal(null)}
                          >
                            <p>输入「清空」后才能继续。此操作不能撤销。</p>
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                const f = new FormData(e.currentTarget);
                                if (f.get("word") !== "清空") {
                                  notify("请输入「清空」");
                                  return;
                                }
                                void restore(initialState())
                                  .then(() => {
                                    setModal(null);
                                    go("首页");
                                    notify("已清空本地数据");
                                  })
                                  .catch(() => notify("清空失败，请重试"));
                              }}
                            >
                              <input
                                name="word"
                                aria-label="输入清空"
                                required
                                autoComplete="off"
                              />
                              <button className="primary danger wide">
                                永久清空
                              </button>
                            </form>
                          </Modal>,
                        );
                      },
                      true,
                    )
                  }
                >
                  <Trash2 size={20} />
                  清空全部数据
                  <ChevronRight size={17} />
                </button>
              </section>
              <p className="page-footer">
                lovely rabbit · v1.0.0
                <Flower2 size={14} />
              </p>
            </>
          )}
        </main>
        <nav className="bottom-nav" aria-label="主导航">
          {[
            ["首页", Home],
            ["日历", CalendarDays],
            ["奖励", Gift],
            ["设置", Settings],
          ].map(([name, Icon]) => {
            const I = Icon as typeof Home;
            return (
              <button
                key={String(name)}
                className={tab === name ? "active" : ""}
                aria-current={tab === name ? "page" : undefined}
                onClick={() => go(String(name))}
              >
                <I size={22} strokeWidth={tab === name ? 1.9 : 1.5} />
                <span>{String(name)}</span>
              </button>
            );
          })}
        </nav>
      </div>
      {checkFeedback &&
        createPortal(
          <div
            key={checkFeedback.id}
            className={`checkin-feedback ${checkFeedback.done ? "" : "undone"}`}
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <span className="feedback-mark">
              {checkFeedback.done ? <Check size={26} /> : <X size={23} />}
            </span>
            <strong>{checkFeedback.done ? "任务完成" : "已撤销打卡"}</strong>
            <span className="feedback-xp">
              {checkFeedback.done ? "+" : "−"}
              {checkFeedback.xp}
              <small>积分</small>
            </span>
          </div>,
          document.body,
        )}
      {toast &&
        createPortal(
          <div className="toast" role="status">
            <Sparkles size={18} />
            {toast}
          </div>,
          document.querySelector("dialog[open]") ?? document.body,
        )}
      {foodEdit && (
        <Modal
          title={`${foodEdit.meal} · ${foodEdit.entry ? "编辑饮食" : "记录饮食"}`}
          className="food-dialog"
          onClose={() => setFoodEdit(null)}
        >
          <FoodSheet
            key={foodEdit.entry?.id ?? `${foodEdit.date}-${foodEdit.meal}`}
            nutrition={s.nutrition}
            date={foodEdit.date}
            meal={foodEdit.meal}
            entry={foodEdit.entry}
            onRemember={async (food) => {
              let stored = food;
              const ok = await run((d) => {
                stored = rememberFood(d.nutrition, food);
              }, "已存入我的食物库");
              return ok ? stored : null;
            }}
            onSave={async (entry, custom) => {
              const ok = await run((d) => {
                saveMeal(d.nutrition, entry, today);
                if (
                  custom &&
                  !d.nutrition.foods.some((f) => f.id === custom.id)
                )
                  d.nutrition.foods.push(custom);
              }, "饮食记录已保存");
              if (ok) setFoodEdit(null);
              return ok;
            }}
          />
        </Modal>
      )}
      {exerciseEdit && (
        <Modal
          title={exerciseEdit.entry ? "编辑运动" : "记录运动"}
          className="meal-sheet"
          onClose={() => setExerciseEdit(null)}
        >
          <ExerciseSheet
            key={exerciseEdit.entry?.id ?? exerciseEdit.date}
            date={exerciseEdit.date}
            entry={exerciseEdit.entry}
            customExercises={s.nutrition.customExercises}
            onRemember={async (exercise) => {
              let stored = exercise;
              const ok = await run((d) => {
                stored = rememberExercise(d.nutrition, exercise);
              }, "已存入我的运动库");
              return ok ? stored : null;
            }}
            weightKg={
              [...s.weights]
                .filter((w) => w.date <= exerciseEdit.date)
                .sort((a, b) => b.date.localeCompare(a.date))[0]?.kg ??
              s.nutrition.profile?.weightKg
            }
            age={s.nutrition.profile?.age}
            onSave={async (entry) => {
              const ok = await run(
                (d) => saveExercise(d.nutrition, entry, today),
                "运动记录已保存",
              );
              if (ok) setExerciseEdit(null);
              return ok;
            }}
          />
        </Modal>
      )}
      {(metabolicOpen ||
        (s.onboarded &&
          !s.nutrition.setupSeen &&
          !modal &&
          taskEdit === undefined &&
          rewardEdit === undefined &&
          !foodEdit &&
          !exerciseEdit)) && (
        <Modal
          title="代谢资料"
          onClose={() => {
            setMetabolicOpen(false);
            void run((d) => {
              d.nutrition.setupSeen = true;
            });
          }}
        >
          <MetabolicForm
            initial={s.nutrition.profile}
            targetKg={s.profile.targetKg}
            onSave={async (value, targetKg) => {
              const ok = await run((d) => {
                d.nutrition.profile = value;
                d.profile.targetKg = targetKg;
                d.nutrition.setupSeen = true;
                d.weights = d.weights.filter((w) => w.date !== today);
                d.weights.push({ date: today, kg: value.weightKg });
              }, "代谢资料已保存");
              if (ok) setMetabolicOpen(false);
              return ok;
            }}
          />
        </Modal>
      )}
      {!s.onboarded && (
        <Modal
          title="先许几个小心愿吧"
          onClose={() =>
            void run((d) => {
              d.onboarded = true;
            })
          }
        >
          <Onboarding
            busy={busy}
            onSave={(names) =>
              void run((d) => {
                d.rewards = names.map((name, i) => ({
                  ...d.rewards[i],
                  id: d.rewards[i]?.id ?? uid(),
                  name,
                  cost: thresholds[i],
                  icon: d.rewards[i]?.icon ?? "gift",
                  image: "",
                  stage: true,
                }));
                d.onboarded = true;
              }, "心愿清单已收藏，今天就开始吧")
            }
          />
          <button
            className="text-button center-button"
            onClick={() =>
              void run((d) => {
                d.onboarded = true;
              })
            }
          >
            先用默认心愿，直接开始
          </button>
        </Modal>
      )}
      {taskEdit !== undefined && (
        <Modal
          title={taskEdit ? "编辑日常任务" : "添加一个小目标"}
          onClose={() => setTaskEdit(undefined)}
        >
          <TaskForm
            busy={busy}
            task={taskEdit ?? undefined}
            onSave={(t) =>
              void run((d) => saveTask(d, t), "任务已保存").then(
                (ok) => ok && setTaskEdit(undefined),
              )
            }
          />
        </Modal>
      )}
      {rewardEdit !== undefined && (
        <Modal
          title={rewardEdit ? "编辑我的心愿" : "新建一个心愿"}
          onClose={() => setRewardEdit(undefined)}
        >
          <RewardForm
            busy={busy}
            reward={rewardEdit ?? undefined}

            onSave={(r) =>
              void run((d) => {
                const index = d.rewards.findIndex((v) => v.id === r.id);
                if (index < 0) d.rewards.push(r);
                else d.rewards[index] = r;
              }, "心愿已保存").then((ok) => ok && setRewardEdit(undefined))
            }
          />
          {rewardEdit && (
            <button
              className="text-button danger-text center-button"
              onClick={() => {
                const r = rewardEdit;
                setRewardEdit(undefined);
                confirm(
                  "删除这份心愿？",
                  "兑换历史仍会保留。至少需要保留一个成长阶段。",
                  () =>
                    run((d) => {
                      d.rewards = d.rewards.filter((v) => v.id !== r.id);
                    }, "心愿已删除"),
                );
              }}
            >
              删除心愿
            </button>
          )}
        </Modal>
      )}
      {modal}
    </div>
  );
}
function shiftMonth(month: string, n: number) {
  const d = new Date(`${month}-01T12:00:00`);
  d.setMonth(d.getMonth() + n);
  return dateKey(d).slice(0, 7);
}
