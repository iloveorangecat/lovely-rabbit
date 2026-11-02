import { test, expect } from "@playwright/test";
test("recent uncompleted habits can be backfilled through the calendar", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Math.random = () => 0.4;
  });
  await page.goto("/");
  await page.getByText("先用默认心愿，直接开始", { exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "代谢资料", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "设置", exact: true }).click();
  await page.getByRole("button", { name: "查看与复制完整备份" }).click();
  const s = JSON.parse(await page.getByLabel("完整 JSON 备份").inputValue()),
    today = s.started;
  const d = new Date(`${today}T12:00:00`);
  d.setDate(d.getDate() - 3);
  const old = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  s.started = old;
  s.tasks.forEach((t: any) => {
    t.created = old;
    t.xp = 4;
  });
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
  if (old.slice(0, 7) !== today.slice(0, 7))
    await page.getByRole("button", { name: "上个月" }).click();
  await page.getByRole("button", { name: new RegExp(`^${old}，`) }).click();
  await expect(page.locator("main .task-card")).toHaveCount(0);
  await page.getByRole("button", { name: "补录打卡", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "完成 热量缺口300kcal", exact: true })
    .click();
  await expect(page.locator("main .task-card")).toHaveCount(1);
  await expect(page.locator("main .task-xp")).toHaveText("+4");
  await page.getByRole("button", { name: "补录打卡", exact: true }).click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("button", { name: "完成 热量缺口300kcal", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await page.reload();
  await expect(page.locator(".xp-number")).toHaveText("4积分");
});
