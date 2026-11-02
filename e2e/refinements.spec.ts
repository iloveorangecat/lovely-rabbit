import { test, expect } from "@playwright/test";
test("nickname, weight recording, growth trail and wish axis", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByText("先用默认心愿，直接开始", { exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "代谢资料", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.locator(".private-badge")).toHaveCount(0);
  await expect(page.locator(".daily-quote")).toHaveCount(0);
  await expect(page.locator(".task-copy small")).toHaveCount(0);
  await page.getByRole("button", { name: "修改昵称", exact: true }).click();
  await page.getByLabel("新的昵称").fill("小月");
  await page.getByRole("button", { name: "保存昵称", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "修改昵称", exact: true }),
  ).toHaveText("小月");
  await page.locator(".weight-record-button").click();
  await page.locator('input[name="weight"]').fill("99.5");
  await page.getByRole("button", { name: "保存记录", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "日历", exact: true }).click();
  await page.getByRole("button", { name: "成长轨迹", exact: false }).click();
  await expect(
    page.getByRole("heading", { name: "成长轨迹", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".weight-row")).toContainText("99.5 斤");
  await expect(page.locator(".stats-grid")).toBeVisible();
  await page.screenshot({ path: "outputs/growth-trail.png", fullPage: true });
  await page.getByRole("button", { name: "奖励", exact: true }).click();
  await expect(page.locator(".axis-node")).toHaveCount(6);
  await expect(
    page.getByRole("progressbar", { name: "心愿总进度" }),
  ).toHaveAttribute("aria-valuenow", "0");
  await page.screenshot({ path: "outputs/wish-axis.png", fullPage: true });
  await page.getByRole("button", { name: "首页", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "修改昵称", exact: true }),
  ).toHaveText("小月");
  await page.screenshot({ path: "outputs/refined-home.png", fullPage: true });
});
