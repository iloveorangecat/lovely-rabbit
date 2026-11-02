import { test, expect } from "@playwright/test";
test("calendar shows only completed tasks and reward cards use larger artwork", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByText("先用默认心愿，直接开始", { exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "代谢资料", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page
    .getByRole("button", { name: "完成 热量缺口300kcal", exact: true })
    .click();
  await expect(page.locator(".task-xp")).toHaveText(/^\+[2-6]$/);
  await expect(page.locator("main .page-footer")).toHaveCount(0);
  await page.getByRole("button", { name: "日历", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "日历", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".task-card")).toHaveCount(1);
  await expect(page.locator(".task-card")).toHaveClass(/done/);
  await expect(page.getByText(/可补录今天/)).toHaveCount(0);
  await page.screenshot({
    path: "outputs/completed-calendar.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "奖励", exact: true }).click();
  await expect(page.locator(".wish-axis-panel .muted")).toHaveCount(0);
  await expect(page.locator(".redemption-empty")).toHaveText(
    "暂无兑换记录，快去打卡吧~",
  );
  const card = await page.locator(".reward-card").first().boundingBox(),
    art = await page.locator(".reward-art").first().boundingBox();
  expect(art!.height / card!.height).toBeGreaterThan(0.4);
  await page.screenshot({
    path: "outputs/larger-wish-art.png",
    fullPage: true,
  });
});
