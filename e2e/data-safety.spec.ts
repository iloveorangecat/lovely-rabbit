import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
async function settings(page: any) {
  await page.getByRole("button", { name: "设置", exact: true }).click();
}
async function start(page: any) {
  await page.goto("/");
  await page.getByText("先用默认心愿，直接开始", { exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "代谢资料", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
}
test("all six data safety entries operate on real isolated browser data", async ({
  page,
  context,
}) => {
  await start(page);
  await page
    .getByRole("button", { name: "完成 热量缺口300kcal", exact: true })
    .click();
  await expect(page.locator(".xp-number")).not.toHaveText("0积分");
  const xp = await page.locator(".xp-number").innerText();
  await settings(page);
  await expect(page.getByText("随身携带这本手账", { exact: true })).toHaveCount(
    0,
  );
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "导出 JSON 备份", exact: true })
    .click();
  const download = await pending;
  await download.saveAs("work/data-safety-export.json");
  const backup = JSON.parse(
    await readFile("work/data-safety-export.json", "utf8"),
  );
  expect(backup.version).toBe(2);
  expect(
    backup.plans.flatMap((p: any) => p.items).filter((i: any) => i.done),
  ).toHaveLength(1);
  await context.grantPermissions(["clipboard-read", "clipboard-write"], {
    origin: "http://localhost:4173",
  });
  const previous = await page.evaluate(() => navigator.clipboard.readText());
  try {
    await page
      .getByRole("button", { name: "查看与复制完整备份", exact: true })
      .click();
    expect(
      JSON.parse(
        await page.getByLabel("完整 JSON 备份", { exact: true }).inputValue(),
      ),
    ).toEqual(backup);
    await page
      .getByRole("button", { name: "复制完整备份", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("完整备份已复制");
    expect(
      JSON.parse(await page.evaluate(() => navigator.clipboard.readText())),
    ).toEqual(backup);
  } finally {
    await page.evaluate(
      (text) => navigator.clipboard.writeText(text),
      previous,
    );
  }
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await page
    .getByRole("button", { name: "粘贴 JSON 恢复", exact: true })
    .click();
  await page.getByLabel("粘贴完整 JSON").fill('{"version":99}');
  await page
    .getByRole("button", { name: "检查并恢复备份", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("原有数据未更改");
  const edited = structuredClone(backup);
  edited.profile.nickname = "恢复样本";
  await page.getByLabel("粘贴完整 JSON").fill(JSON.stringify(edited));
  await page
    .getByRole("button", { name: "检查并恢复备份", exact: true })
    .click();
  await page.getByRole("button", { name: "确认", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("完整恢复");
  await page.getByRole("button", { name: "首页", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "修改昵称", exact: true }),
  ).toHaveText("恢复样本");
  await expect(page.locator(".xp-number")).toHaveText(xp);
  await settings(page);
  await page
    .getByLabel("导入 JSON 备份")
    .setInputFiles("work/data-safety-export.json");
  await page.getByRole("button", { name: "确认", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("完整恢复");
  await page.getByRole("button", { name: /持久存储保护/ }).click();
  await expect(page.getByRole("status")).toHaveText(
    /浏览器已授予持久存储保护|浏览器未授予保护/,
  );
  await page.screenshot({
    path: "outputs/data-safety-checked.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "清空全部数据", exact: true }).click();
  await page.getByRole("button", { name: "再想一想", exact: true }).click();
  await page.getByRole("button", { name: "首页", exact: true }).click();
  await expect(page.locator(".xp-number")).toHaveText(xp);
  await expect(
    page.getByRole("button", { name: "修改昵称", exact: true }),
  ).toHaveText("兔兔");
  await settings(page);
  await page.getByRole("button", { name: "清空全部数据", exact: true }).click();
  await page.getByRole("button", { name: "确认继续", exact: true }).click();
  await page.getByLabel("输入清空").fill("不要清空");
  await page.getByRole("button", { name: "永久清空", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("请输入");
  await page.getByLabel("输入清空").fill("清空");
  await page.getByRole("button", { name: "永久清空", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "先许几个小心愿吧" }),
  ).toBeVisible();
  await page.getByText("先用默认心愿，直接开始", { exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "代谢资料", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.locator(".xp-number")).toHaveText("0积分");
});
test("unsupported persistent storage is reported honestly", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.storage, "persist", {
      value: undefined,
      configurable: true,
    });
  });
  await start(page);
  await settings(page);
  await page.getByRole("button", { name: /持久存储保护/ }).click();
  await expect(page.getByRole("status")).toContainText("当前浏览器不支持");
});
