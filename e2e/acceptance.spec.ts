import { chromium, test, expect } from "@playwright/test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("custom onboarding, unit conversion, real statistics and reward editing/deletion", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("我的成长阶段数").selectOption("3");
  await page.getByLabel("心愿1", { exact: true }).fill("我的第一份礼物");
  await page.getByRole("button", { name: /开启兔兔要减肥/ }).click();
  await expect(
    page.getByRole("heading", { name: "代谢资料", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page
    .getByRole("button", { name: "完成 热量缺口300kcal", exact: true })
    .click();
  const amount = Number((await page.locator(".task-xp").innerText()).slice(1));
  await page.getByRole("button", { name: "设置", exact: true }).click();
  await page.locator(".form-row select").selectOption("kg");
  await expect(page.locator('input[name="target"]')).toHaveValue("50");
  await page.getByRole("button", { name: "首页", exact: true }).click();
  await page.locator(".hero-weight-button").click();
  await page.locator('input[name="weight"]').fill("50.5");
  await page.getByRole("button", { name: "保存记录", exact: true }).click();
  await expect(page.locator(".weight-pair")).toContainText("50.5 kg");
  await page.getByRole("button", { name: "日历", exact: true }).click();
  await page.getByRole("button", { name: "成长轨迹", exact: true }).click();
  await expect(page.locator(".stat-card").nth(0)).toContainText("1次");
  await expect(page.locator(".stat-card").nth(1)).toContainText(
    `${amount}积分`,
  );
  await expect(page.locator(".stat-card").nth(2)).toContainText("25%");
  await expect(page.locator(".weight-row")).toContainText("50.5 kg");
  await page.getByRole("button", { name: "奖励", exact: true }).click();
  await expect(page.locator(".reward-card")).toHaveCount(3);
  await page
    .getByRole("button", { name: "编辑 我的第一份礼物", exact: true })
    .click();
  await page.getByLabel("心愿名称").fill("一朵小花");
  await page.getByLabel("所需积分").fill("1");
  await page.getByRole("button", { name: "保存心愿", exact: true }).click();
  await page
    .locator(".reward-card")
    .first()
    .getByRole("button", { name: "兑换心愿", exact: true })
    .click();
  await page.getByRole("button", { name: "确认", exact: true }).click();
  await expect(page.locator(".balance-strip strong")).toHaveText(
    `${amount - 1} 积分`,
  );
  await expect(page.locator(".history-row")).toContainText("一朵小花");
  await page
    .getByRole("button", { name: "编辑 一朵小花", exact: true })
    .click();
  await page.getByRole("button", { name: "删除心愿", exact: true }).click();
  await page.getByRole("button", { name: "确认", exact: true }).click();
  await expect(page.locator(".reward-card")).toHaveCount(2);
  await expect(page.locator(".history-row")).toContainText("一朵小花");
  await expect(page.locator(".axis-summary strong")).toHaveText(
    `${amount} 积分`,
  );
});

test("a fully closed browser reopens its saved records and cached app offline", async () => {
  const dir = await mkdtemp(join(tmpdir(), "bq-restart-"));
  let context = await chromium.launchPersistentContext(dir, {
    viewport: { width: 393, height: 873 },
  });
  try {
    let page = await context.newPage();
    await page.goto("http://localhost:4173/");
    await page.getByText("先用默认心愿，直接开始", { exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "代谢资料", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "关闭", exact: true }).click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page
      .getByRole("button", { name: "完成 喝水1500ml", exact: true })
      .click();
    await expect(page.locator(".xp-number")).not.toHaveText("0积分");
    const balance = await page.locator(".xp-number").innerText();
    await page
      .getByRole("button", { name: "写今天的日记", exact: true })
      .click();
    await page
      .getByLabel("日记内容", { exact: true })
      .fill("浏览器完整退出后，仍然保留这篇日记。");
    await page.getByRole("button", { name: "保存日记", exact: true }).click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await context.close();
    context = await chromium.launchPersistentContext(dir, {
      viewport: { width: 393, height: 873 },
    });
    await context.setOffline(true);
    page = await context.newPage();
    await page.goto("http://localhost:4173/");
    await expect(page.locator(".xp-number")).toHaveText(balance);
    await page.getByRole("button", { name: "日历", exact: true }).click();
    await expect(page.locator(".diary-entry")).toContainText(
      "浏览器完整退出后",
    );
    await page.getByRole("button", { name: "首页", exact: true }).click();
    await page
      .getByRole("button", { name: "完成 热量缺口300kcal", exact: true })
      .click();
    await expect(page.locator(".task-card.done")).toHaveCount(2);
  } finally {
    await context.close();
  }
});
