import { test, expect } from "@playwright/test";
async function start(page: any) {
  await page.goto("/");
  await page.getByText("先用默认心愿，直接开始", { exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "代谢资料", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByRole("heading", { name: "今日任务" })).toBeVisible();
}
test("onboarding, claim, reload, undo, backup and restore", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await start(page);
  const balance = page.locator(".xp-number");
  await expect(balance).toHaveText("0积分");
  const task = page.getByRole("button", {
    name: "完成 热量缺口300kcal",
    exact: true,
  });
  await expect(task.locator(".task-xp")).toHaveCount(0);
  await task.click();
  await expect(page.locator(".checkin-feedback")).toContainText("任务完成");
  const feedback = page.locator(".feedback-xp");
  await expect(feedback).toHaveText(/\+[2-6]积分/);
  const amount = Number((await feedback.innerText()).replace(/\D/g, ""));
  const center = await page.locator(".checkin-feedback").boundingBox();
  expect(
    Math.abs(center!.y + center!.height / 2 - page.viewportSize()!.height / 2),
  ).toBeLessThan(4);
  await expect(page.locator(".toast")).toHaveCount(0);
  await expect(balance).toHaveText(`${amount}积分`);
  await page.reload();
  await expect(balance).toHaveText(`${amount}积分`);
  await page
    .getByRole("button", { name: "撤销 热量缺口300kcal", exact: true })
    .click();
  await expect(balance).toHaveText("0积分");
  await expect(
    page
      .getByRole("button", { name: "完成 热量缺口300kcal", exact: true })
      .locator(".task-xp"),
  ).toHaveCount(0);
  await expect(page.locator(".checkin-feedback")).toContainText("已撤销打卡");
  await page
    .getByRole("button", { name: "完成 热量缺口300kcal", exact: true })
    .click();
  await expect(balance).toHaveText(`${amount}积分`);
  await page.getByRole("button", { name: "设置", exact: true }).click();
  await page.getByRole("button", { name: "查看与复制完整备份" }).click();
  const backup = await page.getByLabel("完整 JSON 备份").inputValue();
  expect(JSON.parse(backup).version).toBe(2);
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await page.getByLabel("导入 JSON 备份").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":99}'),
  });
  await expect(page.getByRole("status")).toContainText("原有数据未更改");
  await page.getByLabel("导入 JSON 备份").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(backup),
  });
  await page.getByRole("button", { name: "确认", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("完整恢复");
  await page.getByRole("button", { name: "首页", exact: true }).click();
  await expect(balance).toHaveText(`${amount}积分`);
  expect(errors).toEqual([]);
});
test("all four views fit narrow screens", async ({ page }) => {
  await start(page);
  for (const width of [320, 393, 430, 768, 1280]) {
    await page.setViewportSize({ width, height: 873 });
    for (const name of ["首页", "日历", "奖励", "设置"]) {
      await page.getByRole("button", { name, exact: true }).click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await expect(page.locator(".desktop-aside")).toHaveCount(0);
      const shell = await page.locator(".phone-shell").boundingBox();
      const nav = await page.locator(".bottom-nav").boundingBox();
      expect(shell!.width).toBe(Math.min(width, 430));
      expect(Math.abs(shell!.x + shell!.width / 2 - width / 2)).toBeLessThan(1);
      expect(Math.abs(nav!.x - shell!.x)).toBeLessThan(1);
      expect(Math.abs(nav!.width - shell!.width)).toBeLessThan(1);
      if (name === "首页" && width === 1280)
        await page.screenshot({ path: "outputs/mobile-layout-desktop.png" });
      if (name === "首页" && width === 393)
        await page.screenshot({ path: "outputs/BeautyQuest-mobile.png" });
      await page.screenshot({
        path: `work/${name}-${width}.png`,
        fullPage: true,
      });
    }
  }
  await expect(page.getByRole("heading", { name: "我的手账设置" })).toHaveCount(
    0,
  );
  await expect(page.getByRole("switch", { name: "深色模式" })).toHaveCount(0);
  await expect(page.getByLabel("目标体重", { exact: true })).toBeVisible();
});
test("reward confirmation, balances and lifetime 积分", async ({ page }) => {
  await start(page);
  await page
    .getByRole("button", { name: "完成 热量缺口300kcal", exact: true })
    .click();
  await expect(page.locator(".xp-number")).not.toHaveText("0积分");
  const original = Number(
    (await page.locator(".xp-number").innerText()).replace(/\D/g, ""),
  );
  await page.getByRole("button", { name: "奖励", exact: true }).click();
  await page
    .getByRole("button", { name: "编辑 买一个发饰", exact: true })
    .click();
  await page.getByLabel("所需积分").fill(String(original));
  await page.getByRole("button", { name: "保存心愿" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page
    .getByRole("button", { name: "兑换心愿", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "确认", exact: true }).click();
  await expect(page.locator(".balance-strip strong")).toHaveText("0 积分");
  await expect(page.locator(".history-row")).toHaveCount(1);
  await page.getByRole("button", { name: "首页", exact: true }).click();
  await expect(page.locator(".hero-point-pair strong").first()).toHaveText(
    `${original}积分`,
  );
});
test("service worker offline reload and offline persistence", async ({
  page,
  context,
}) => {
  await start(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "今日任务" })).toBeVisible();
  await page
    .getByRole("button", { name: "完成 热量缺口300kcal", exact: true })
    .click();
  await expect(page.locator(".xp-number")).not.toHaveText("0积分");
  const xp = await page.locator(".xp-number").innerText();
  await page.reload();
  await expect(page.locator(".xp-number")).toHaveText(xp);
  await context.setOffline(false);
});

test("native JSON download", async ({ page }) => {
  await start(page);
  await page.getByRole("button", { name: "设置", exact: true }).click();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出 JSON 备份" }).click();
  const file = await pending;
  const failure = await file.failure();
  test.skip(
    process.env.BQ_SANDBOX_DOWNLOADS === "1" && failure === "canceled",
    "Windows execution sandbox cancels all native browser downloads, including ordinary static files. JSON payload and recovery are tested separately.",
  );
  expect(failure).toBeNull();
  await file.saveAs("work/e2e-backup.json");
});

test("custom task, daily cap and modal validation feedback", async ({
  page,
}) => {
  await start(page);
  for (let i = 0; i < 4; i++) {
    await page.getByRole("button", { name: "添加一个小目标" }).click();
    await page.getByLabel("任务名称").fill(`温柔目标 ${i + 1}`);
    await expect(page.getByRole("dialog").locator("select")).toHaveCount(0);
    await expect(page.getByText("计入训练次数", { exact: true })).toHaveCount(
      0,
    );
    await page.getByRole("button", { name: "保存任务", exact: true }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
  }
  await expect(page.locator(".task-card")).toHaveCount(8);
  await page.getByRole("button", { name: "添加一个小目标" }).click();
  await page.getByLabel("任务名称").fill("第九项");
  await page.getByRole("button", { name: "保存任务", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("每天最多安排 8 个任务");
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await page
    .getByRole("button", { name: "完成 温柔目标 1", exact: true })
    .click();
  await expect(page.locator(".xp-number")).toHaveText(/^[2-6]积分$/);
});

test("paste recovery, historical backfill, weekday schedule and protected history", async ({
  page,
}) => {
  await start(page);
  await page.getByRole("button", { name: "设置", exact: true }).click();
  await page.getByRole("button", { name: "查看与复制完整备份" }).click();
  const s = JSON.parse(await page.getByLabel("完整 JSON 备份").inputValue());
  const today = s.started;
  const offset = (n: number) => {
    const d = new Date(`${today}T12:00:00`);
    d.setDate(d.getDate() + n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  s.started = offset(-4);
  s.tasks.forEach((t: any) => {
    t.created = s.started;
    t.xp = 4;
  });
  s.tasks[3].days = [(new Date(`${today}T12:00:00`).getDay() + 1) % 7];
  s.plans = [-3, -4].map((n) => ({
    date: offset(n),
    items: [
      {
        taskId: s.tasks[0].id,
        name: s.tasks[0].name,
        xp: 4,
        training: false,
        done: true,
        awarded: true,
      },
    ],
  }));
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await page
    .getByRole("button", { name: "粘贴 JSON 恢复", exact: true })
    .click();
  await page.getByLabel("粘贴完整 JSON").fill(JSON.stringify(s));
  await page.getByRole("button", { name: "检查并恢复备份" }).click();
  await page.getByRole("button", { name: "确认", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("完整恢复");
  await page.reload();
  await page.getByRole("button", { name: "日历", exact: true }).click();
  const d = offset(-3);
  if (d.slice(0, 7) !== today.slice(0, 7))
    await page.getByRole("button", { name: "上个月" }).click();
  await page.getByRole("button", { name: new RegExp(`^${d}，`) }).click();
  await expect(
    page.getByRole("button", { name: "撤销 热量缺口300kcal", exact: true }),
  ).toContainText("+4");
  const old = offset(-4);
  if (old.slice(0, 7) !== d.slice(0, 7))
    await page.getByRole("button", { name: "上个月" }).click();
  await page.getByRole("button", { name: new RegExp(`^${old}，`) }).click();
  await expect(
    page.getByRole("button", { name: "撤销 热量缺口300kcal", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "首页", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "完成 12点前睡觉", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".xp-number")).toHaveText("8积分");
});

test("clear requires two confirmations and exact text", async ({ page }) => {
  await start(page);
  await page
    .getByRole("button", { name: "完成 热量缺口300kcal", exact: true })
    .click();
  await expect(page.locator(".xp-number")).not.toHaveText("0积分");
  await page.getByRole("button", { name: "设置", exact: true }).click();
  await page.getByRole("button", { name: "清空全部数据", exact: true }).click();
  await page.getByRole("button", { name: "确认继续", exact: true }).click();
  await page.getByLabel("输入清空").fill("保留");
  await page.getByRole("button", { name: "永久清空", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("请输入");
  await page.getByLabel("输入清空").fill("清空");
  await page.getByRole("button", { name: "永久清空", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "先许几个小心愿吧" }),
  ).toBeVisible();
  await page.getByText("先用默认心愿，直接开始", { exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "代谢资料", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await expect(page.locator(".xp-number")).toHaveText("0积分");
});

test("only centered 积分 feedback appears when a check-in unlocks a stage", async ({
  page,
}) => {
  await start(page);
  await page.getByRole("button", { name: "奖励", exact: true }).click();
  await page
    .getByRole("button", { name: "编辑 买一个发饰", exact: true })
    .click();
  await page.getByLabel("所需积分").fill("2");
  await page.getByRole("button", { name: "保存心愿", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "首页", exact: true }).click();
  await page
    .getByRole("button", { name: "完成 热量缺口300kcal", exact: true })
    .click();
  await expect(page.locator(".checkin-feedback")).toContainText("任务完成");
  await expect(page.locator(".level-pill")).toHaveCount(0);
  await expect(page.locator(".hero-wish-title")).toHaveText("看一部想看的电影");
  await expect(page.locator(".toast")).toHaveCount(0);
  await expect(page.locator(".checkin-feedback")).toHaveCSS("opacity", "1");
  await page.screenshot({ path: "outputs/checkin-feedback.png" });
  await expect(page.locator(".checkin-feedback")).not.toBeVisible({
    timeout: 3500,
  });
});
