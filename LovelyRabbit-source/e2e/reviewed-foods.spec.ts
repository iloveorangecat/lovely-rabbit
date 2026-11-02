import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const approved = JSON.parse(
  readFileSync(
    new URL("../scripts/data/reviewed-100g.json", import.meta.url),
    "utf8",
  ),
);
test("all 179 approved names are searchable offline and cup records survive edit and backup", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.getByText("先用默认心愿，直接开始", { exact: true }).click();
  await page.getByRole("heading", { name: "代谢资料", exact: true }).waitFor();
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: "早餐记录", exact: true }).click();
  const query = page.getByLabel("搜索食物", { exact: true });
  for (const food of approved.foods) {
    await query.fill(food.name);
    const result = page.locator(".food-result").first();
    await expect(result.locator("strong")).toHaveText(food.name);
    await expect(result.locator("em")).toContainText(String(food.kcalPer100g));
  }
  await query.fill("红心火龙果");
  await expect(page.locator(".food-result").first()).toContainText("55.5");
  await query.fill("无糖豆浆");
  await page.locator(".food-result").first().click();
  await page.getByLabel("食用单位", { exact: true }).selectOption("杯");
  await expect(page.getByLabel("每份可食重量")).toHaveCount(0);
  await expect(page.locator(".meal-preview")).toContainText("80");
  await page.getByLabel("食用数量", { exact: true }).fill("1.5");
  await expect(page.locator(".meal-preview")).toContainText("120");
  await page.getByRole("button", { name: "添加饮食记录", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.reload();
  await page.getByRole("button", { name: "日历", exact: true }).click();
  await expect(page.locator(".meal-record")).toContainText("1.5 杯");
  await expect(page.locator(".meal-record")).toContainText("120");
  await page
    .getByRole("button", { name: "编辑饮食 无糖豆浆", exact: true })
    .click();
  await expect(page.locator(".meal-preview")).toContainText("120");
  await page.getByLabel("食用单位", { exact: true }).selectOption("g");
  await expect(page.locator(".meal-preview")).toContainText("30");
  await page.getByLabel("食用单位", { exact: true }).selectOption("杯");
  await page.getByRole("button", { name: "保存饮食修改", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "设置", exact: true }).click();
  await page
    .getByRole("button", { name: "查看与复制完整备份", exact: true })
    .click();
  const backup = JSON.parse(
    await page.getByLabel("完整 JSON 备份").inputValue(),
  );
  expect(backup.nutrition.meals[0].unitCalories.kcal).toBe(80);
  expect(backup.nutrition.meals[0].gramsPerUnit).toBeNull();
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await page
    .getByRole("button", { name: "粘贴 JSON 恢复", exact: true })
    .click();
  await page.getByLabel("粘贴完整 JSON").fill(JSON.stringify(backup));
  await page.getByRole("button", { name: "检查并恢复备份" }).click();
  await page.getByRole("button", { name: "确认", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("完整恢复");
  await page.reload();
  await page.getByRole("button", { name: "日历", exact: true }).click();
  await expect(page.locator(".meal-record")).toContainText("80");
});
