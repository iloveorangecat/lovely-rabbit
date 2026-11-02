import { test, expect } from "@playwright/test";

test("single-field diary survives reload and appears below calendar tasks", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByText("先用默认心愿，直接开始", { exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "代谢资料", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.locator(".bottom-nav > button")).toHaveCount(4);
  await expect(page.locator(".level-pill")).toHaveCount(0);
  await expect(page.locator(".hero-wish-title")).toHaveText("买一个发饰");
  await page.getByRole("button", { name: /写今天的日记/ }).click();
  await expect(page.getByRole("dialog").locator("textarea")).toHaveCount(1);
  await page
    .getByLabel("日记内容", { exact: true })
    .fill("今天散步很舒服。\n想把这件小事记下来。");
  await page.getByRole("button", { name: "保存日记", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "日历", exact: true }).click();
  await expect(page.locator(".diary-entry")).toContainText("今天散步很舒服。");
  const tasks = await page.locator(".task-list").boundingBox();
  const diary = await page.locator(".diary-entry").boundingBox();
  expect(diary!.y).toBeGreaterThan(tasks!.y + tasks!.height);
  await page.reload();
  await page.getByRole("button", { name: "日历", exact: true }).click();
  await expect(page.locator(".diary-entry")).toContainText(
    "想把这件小事记下来。",
  );
  await page.screenshot({ path: "outputs/calendar-diary.png", fullPage: true });
  await page.getByRole("button", { name: "首页", exact: true }).click();
  await expect(page.locator(".xp-number")).toHaveText("0积分");
  await page.screenshot({ path: "outputs/wish-home.png", fullPage: true });
});
