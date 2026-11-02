import { test, expect } from "@playwright/test";
test("centered food modal, compact centered cards and offline reusable personal catalogs", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.getByText("先用默认心愿，直接开始", { exact: true }).click();
  await page.getByRole("heading", { name: "代谢资料", exact: true }).waitFor();
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await expect(
    page.getByRole("button", { name: "打开日历", exact: true }),
  ).toHaveCount(0);
  const task = await page.locator(".task-card").first().boundingBox();
  expect(task!.height).toBeCloseTo(61.6, 0);
  const copy = await page
    .locator(".task-card .task-copy")
    .first()
    .boundingBox();
  expect(
    Math.abs(copy!.y + copy!.height / 2 - task!.y - task!.height / 2),
  ).toBeLessThan(1);
  await page.getByRole("button", { name: "早餐记录", exact: true }).click();
  const modal = await page.locator(".food-dialog").boundingBox();
  expect(Math.abs(modal!.y + modal!.height / 2 - 873 / 2)).toBeLessThan(2);
  await page.getByLabel("搜索食物", { exact: true }).fill("我的独家早餐");
  await page
    .getByRole("button", { name: "找不到？按包装标签手动添加", exact: true })
    .click();
  await page.getByLabel("自定义食物名称").fill("我的独家早餐");
  await page.getByLabel("每100g热量").fill("110");
  await page.getByRole("button", { name: "使用这项食物", exact: true }).click();
  await page.getByLabel("食用数量", { exact: true }).waitFor();
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "运动记录", exact: true }).click();
  await page
    .getByRole("button", { name: "找不到？添加自定义运动", exact: true })
    .click();
  await page.getByLabel("自定义运动名称").fill("我的舞蹈课程");
  await page.getByLabel("参考运动分钟").fill("30");
  await page.getByLabel("参考运动热量").fill("120");
  await page
    .getByRole("button", { name: "保存到我的运动库", exact: true })
    .click();
  await page.getByLabel("自定义运动分钟").waitFor();
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: "午餐记录", exact: true }).click();
  await page.getByLabel("搜索食物", { exact: true }).fill("我的独家早餐");
  await page.locator(".food-result").first().click();
  await page.getByLabel("食用数量", { exact: true }).fill("150");
  await expect(page.locator(".meal-preview")).toContainText("165");
  await page.screenshot({
    path: "outputs/centered-food-dialog.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "添加饮食记录", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "运动记录", exact: true }).click();
  await page.getByLabel("搜索运动", { exact: true }).fill("我的舞蹈课程");
  await page.locator(".custom-exercise-result").click();
  await page.getByLabel("自定义运动分钟").fill("60");
  await expect(page.locator(".exercise-estimate")).toContainText("240");
  await page.getByRole("button", { name: "添加运动记录", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "日历", exact: true }).click();
  await expect(page.locator(".meal-record")).toHaveCount(2);
  const card = await page.locator(".meal-record").first().boundingBox();
  expect(card!.height).toBeCloseTo(61.6, 0);
  await page.screenshot({
    path: "outputs/compact-personal-records.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "设置", exact: true }).click();
  await page
    .getByRole("button", { name: "查看与复制完整备份", exact: true })
    .click();
  const backup = JSON.parse(
    await page.getByLabel("完整 JSON 备份").inputValue(),
  );
  expect(backup.nutrition.foods).toHaveLength(1);
  expect(backup.nutrition.customExercises).toHaveLength(1);
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await page
    .getByRole("button", { name: "粘贴 JSON 恢复", exact: true })
    .click();
  await page.getByLabel("粘贴完整 JSON").fill(
    JSON.stringify({
      ...backup,
      nutrition: { ...backup.nutrition, meals: [], exercises: [] },
    }),
  );
  await page.getByRole("button", { name: "检查并恢复备份" }).click();
  await page.getByRole("button", { name: "确认", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("完整恢复");
  await page.reload();
  await page.getByRole("button", { name: "首页", exact: true }).click();
  await page.getByRole("button", { name: "运动记录", exact: true }).click();
  await page.getByLabel("搜索运动", { exact: true }).fill("我的舞蹈课程");
  await expect(page.locator(".custom-exercise-result")).toContainText("120");
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await page.getByRole("button", { name: "晚餐记录", exact: true }).click();
  await page.getByLabel("搜索食物", { exact: true }).fill("我的独家早餐");
  await expect(page.locator(".food-result")).toContainText("110");
});
