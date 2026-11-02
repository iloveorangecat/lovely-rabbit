import { test, expect } from "@playwright/test";
async function start(page: any) {
  await page.goto("/");
  await page.getByText("先用默认心愿，直接开始", { exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "代谢资料", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "代谢资料", exact: true }),
  ).toBeVisible();
}
test("meal drawer, sliding quantity, calibrated units, calendar edits and backup persist", async ({
  page,
}) => {
  await start(page);
  await page.getByLabel("年龄", { exact: true }).fill("30");
  await page.getByLabel("身高", { exact: true }).fill("160");
  await page.getByLabel("代谢体重", { exact: true }).fill("60");
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "早餐记录", exact: true }).click();
  await expect(page.locator("dialog.food-dialog")).toBeVisible();
  const sheet = await page.locator("dialog.food-dialog").boundingBox();
  expect(Math.abs(sheet!.y + sheet!.height / 2 - 873 / 2)).toBeLessThan(2);
  await expect(page.locator(".food-results")).toHaveCount(0);
  await page.getByLabel("搜索食物", { exact: true }).fill("测试饭团");
  await page
    .getByRole("button", { name: "找不到？按包装标签手动添加", exact: true })
    .click();
  await page.getByLabel("自定义食物名称").fill("测试饭团");
  await page.getByLabel("每100g热量").fill("120");
  await page.getByRole("button", { name: "使用这项食物" }).click();
  await page.getByLabel("食用单位", { exact: true }).selectOption("个");
  await page.getByLabel("每份可食重量", { exact: true }).fill("100");
  await page
    .getByRole("slider", { name: "食用份量刻度", exact: true })
    .press("ArrowRight");
  await expect(page.getByLabel("食用数量", { exact: true })).toHaveValue("1.1");
  await page
    .getByRole("slider", { name: "食用份量刻度", exact: true })
    .evaluate((el) => {
      el.scrollLeft = 240;
    });
  await expect(page.getByLabel("食用数量", { exact: true })).toHaveValue("3");
  await page.getByLabel("食用数量", { exact: true }).fill("1.5");
  await expect(page.locator(".meal-preview")).toContainText("180");
  await page.getByRole("button", { name: "添加饮食记录", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await expect(
    page.getByRole("button", { name: "早餐记录", exact: true }),
  ).toContainText("180 千卡");
  await expect(page.locator(".gap-shortcut strong")).toHaveText("+1,109");
  await expect(page.locator(".xp-number")).toHaveText("0积分");
  await page.getByRole("button", { name: "午餐记录", exact: true }).click();
  await page.getByLabel("搜索食物", { exact: true }).fill("测试饭团");
  await page.locator(".food-result").first().click();
  await expect(page.getByLabel("食用单位", { exact: true })).toHaveValue("个");
  await expect(page.getByLabel("每份可食重量", { exact: true })).toHaveValue(
    "100",
  );
  await page.getByLabel("食用数量", { exact: true }).fill(".5");
  await page.getByRole("button", { name: "添加饮食记录", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "日历", exact: true }).click();
  await expect(page.locator(".meal-record")).toHaveCount(2);
  const meals = await page.locator(".meal-records").boundingBox(),
    tasks = await page.locator("main .task-list").boundingBox(),
    diary = await page.locator(".diary-entry").boundingBox();
  expect(meals!.y).toBeGreaterThan(tasks!.y + tasks!.height);
  expect(diary!.y).toBeGreaterThan(meals!.y + meals!.height);
  await page
    .getByRole("button", { name: "编辑饮食 测试饭团", exact: true })
    .first()
    .click();
  await page.getByLabel("食用数量", { exact: true }).fill("2");
  await page.getByRole("button", { name: "保存饮食修改", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await expect(page.locator(".meal-record").first()).toContainText("240");
  await page
    .getByRole("button", { name: "删除饮食 测试饭团", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "确认", exact: true }).click();
  await expect(page.locator(".meal-record")).toHaveCount(1);
  await page.reload();
  await page.getByRole("button", { name: "首页", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "午餐记录", exact: true }),
  ).toContainText("60 千卡");
  await expect(page.locator(".gap-shortcut strong")).toHaveText("+1,229");
  await page.getByRole("button", { name: "设置", exact: true }).click();
  await page.getByRole("button", { name: "查看与复制完整备份" }).click();
  const backup = JSON.parse(
    await page.getByLabel("完整 JSON 备份").inputValue(),
  );
  expect(backup.version).toBe(2);
  expect(backup.nutrition.meals).toHaveLength(1);
  expect(backup.nutrition.servings[0].grams).toBe(100);
  expect(backup.nutrition.profile.age).toBe(30);
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await page.getByRole("button", { name: "日历", exact: true }).click();
  await page
    .getByRole("button", { name: "删除饮食 测试饭团", exact: true })
    .click();
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
  await expect(page.locator(".meal-record")).toHaveCount(1);
  await expect(page.locator(".meal-record")).toContainText("60");
});
test("full food catalog and gram records work offline alongside exercise entry", async ({
  page,
  context,
}) => {
  await start(page);
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: "晚餐记录", exact: true }).click();
  await page.getByLabel("搜索食物", { exact: true }).fill("鸡蛋");
  await expect(page.locator(".food-result").first()).toBeVisible();
  await page.locator(".food-result").first().click();
  await expect(page.getByLabel("食用单位", { exact: true })).toHaveValue("g");
  await page.getByLabel("食用数量", { exact: true }).fill("150");
  await page.getByRole("button", { name: "添加饮食记录", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await expect(
    page.getByRole("button", { name: "晚餐记录", exact: true }),
  ).toContainText("千卡");
  await page.reload();
  await page.getByRole("button", { name: "日历", exact: true }).click();
  await expect(page.locator(".meal-record")).toHaveCount(1);
  await expect(page.locator(".meal-record")).toContainText("150 g");
  await page.screenshot({
    path: "outputs/nutrition-calendar.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "首页", exact: true }).click();
  await page.getByRole("button", { name: "运动记录", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "记录运动", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await page.screenshot({ path: "outputs/nutrition-home.png", fullPage: true });
});
