import { test, expect } from "@playwright/test";
test("metabolic defaults, target persistence, rabbit name and search-first portion ruler", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByText("先用默认心愿，直接开始", { exact: true }).click();
  await expect(page.getByLabel("身高", { exact: true })).toHaveValue("160");
  await expect(page.getByLabel("代谢体重", { exact: true })).toHaveValue("50");
  await expect(page.getByLabel("代谢目标体重", { exact: true })).toHaveValue(
    "50",
  );
  await expect(page.getByText("稍后填写资料", { exact: true })).toHaveCount(0);
  await page.getByLabel("年龄", { exact: true }).fill("25");
  await page.getByLabel("代谢目标体重", { exact: true }).fill("48");
  await page.screenshot({
    path: "outputs/metabolic-refined.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await expect(
    page.getByRole("button", { name: "修改昵称", exact: true }),
  ).toHaveText("兔兔");
  await expect(page.locator(".weight-pair")).toContainText("96 斤");
  await expect(page.locator(".nutrition-shortcuts")).not.toContainText("记录");
  await expect(page.locator(".energy-gap-note")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".weight-pair")).toContainText("96 斤");
  await page.getByRole("button", { name: "早餐记录", exact: true }).click();
  await expect(page.locator(".food-results")).toHaveCount(0);
  await expect(page.locator(".food-source-note")).toHaveCount(0);
  await page.screenshot({
    path: "outputs/food-search-refined.png",
    fullPage: true,
  });
  await page.getByLabel("搜索食物", { exact: true }).fill("鸡蛋");
  await page.locator(".food-result").first().click();
  await expect(page.getByLabel("食用数量", { exact: true })).toHaveValue("100");
  await page
    .getByRole("slider", { name: "食用份量刻度", exact: true })
    .evaluate((el) => {
      el.scrollLeft = 1200;
    });
  await expect(page.getByLabel("食用数量", { exact: true })).toHaveValue("150");
  await page.screenshot({
    path: "outputs/food-ruler-refined.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "添加饮食记录", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await expect(
    page.getByRole("button", { name: "早餐记录", exact: true }),
  ).toContainText("千卡");
  await page.screenshot({
    path: "outputs/home-intake-refined.png",
    fullPage: true,
  });
});
