import { test, expect } from "@playwright/test";
test("official exercise selection, wheel, offline persistence, edit, delete and backup recovery", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.getByText("先用默认心愿，直接开始", { exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "代谢资料", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: "运动记录", exact: true }).click();
  await page.getByLabel("搜索运动", { exact: true }).fill("17190");
  await page.locator(".exercise-results .food-result").click();
  await page.getByLabel("运动体重", { exact: true }).fill("60");
  await page.getByLabel("运动年龄", { exact: true }).fill("30");
  await expect(page.locator(".exercise-estimate")).toContainText("114 千卡");
  await page
    .getByRole("spinbutton", { name: "运动时长十位", exact: true })
    .press("ArrowDown");
  await expect(page.getByLabel("运动分钟", { exact: true })).toHaveValue("40");
  await page.getByLabel("运动分钟", { exact: true }).fill("30");
  await page.screenshot({
    path: "outputs/exercise-drawer.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "添加运动记录", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await expect(
    page.getByRole("button", { name: "运动记录", exact: true }),
  ).toContainText("114 千卡");
  await page.reload();
  await page.getByRole("button", { name: "日历", exact: true }).click();
  await expect(page.locator(".meal-record")).toHaveCount(1);
  await expect(page.locator(".meal-record")).toContainText("30 分钟");
  await page.getByRole("button", { name: /编辑运动 中速步行/ }).click();
  await page.getByLabel("运动分钟", { exact: true }).fill("60");
  await page.getByRole("button", { name: "保存运动修改", exact: true }).click();
  await expect(page.locator(".meal-record")).toContainText("228");
  await page.screenshot({
    path: "outputs/exercise-calendar.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "设置", exact: true }).click();
  await page
    .getByRole("button", { name: "查看与复制完整备份", exact: true })
    .click();
  const backup = JSON.parse(
    await page.getByLabel("完整 JSON 备份").inputValue(),
  );
  expect(backup.nutrition.exercises[0].snapshot.met).toBe(3.8);
  expect(backup.nutrition.exercises[0].snapshot.weightKg).toBe(60);
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await page.getByRole("button", { name: "日历", exact: true }).click();
  await page.getByRole("button", { name: /删除运动 中速步行/ }).click();
  await page.getByRole("button", { name: "确认", exact: true }).click();
  await expect(page.locator(".meal-record")).toHaveCount(0);
  await page.getByRole("button", { name: "设置", exact: true }).click();
  await page
    .getByRole("button", { name: "粘贴 JSON 恢复", exact: true })
    .click();
  await page.getByLabel("粘贴完整 JSON").fill(JSON.stringify(backup));
  await page.getByRole("button", { name: "检查并恢复备份" }).click();
  await page.getByRole("button", { name: "确认", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("完整恢复");
  await page.reload();
  await page.getByRole("button", { name: "日历", exact: true }).click();
  await expect(page.locator(".meal-record")).toContainText("228");
  for (const width of [320, 393, 430]) {
    await page.setViewportSize({ width, height: 873 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
