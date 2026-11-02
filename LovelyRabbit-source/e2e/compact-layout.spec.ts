import { test, expect } from "@playwright/test";
test("square wishes scroll axis nodes in one row and weight stays visible", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByText("先用默认心愿，直接开始", { exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "代谢资料", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.locator(".weight-pair")).toContainText("目标体重");
  await expect(page.locator(".weight-pair")).toContainText("当前体重");
  await page.locator(".hero-weight-button").click();
  await expect(
    page.getByRole("heading", { name: "体重记录", exact: true }),
  ).toBeVisible();
  await page.locator('input[name="weight"]').fill("98.2");
  await page.getByRole("button", { name: "保存记录", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.locator(".weight-pair")).toContainText("98.2 斤");
  await page.screenshot({ path: "outputs/refined-home.png", fullPage: true });
  await page.getByRole("button", { name: "奖励", exact: true }).click();
  await expect(page.locator(".axis-row")).toHaveCount(1);
  await expect(page.locator(".axis-node")).toHaveCount(6);
  await expect(page.locator(".wish-axis-horizontal")).not.toContainText(
    "买一个发饰",
  );
  await page.getByRole("button", { name: "新增奖励", exact: true }).click();
  await page.getByLabel("心愿名称").fill("新增的小礼物");
  await page.getByLabel("所需积分").fill("468");
  await page.getByRole("button", { name: "保存心愿", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.locator(".axis-row")).toHaveCount(1);
  await expect(page.locator(".axis-row").locator(".axis-node")).toHaveCount(7);
  await expect(page.locator(".axis-row")).toContainText("心愿7");
  expect(
    await page
      .locator(".wish-axis-horizontal")
      .evaluate((el) => el.scrollWidth > el.clientWidth),
  ).toBe(true);
  for (const width of [320, 393, 430]) {
    await page.setViewportSize({ width, height: 873 });
    for (const card of await page.locator(".reward-card").all()) {
      const b = await card.boundingBox();
      expect(Math.abs(b!.width - b!.height)).toBeLessThan(2);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 393, height: 873 });
  await expect(page.locator("main")).not.toContainText("XP");
  await page.screenshot({
    path: "outputs/horizontal-wishes.png",
    fullPage: true,
  });
});
