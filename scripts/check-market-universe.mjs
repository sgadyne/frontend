import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const base = process.env.SAMPO_URL,
  auth = process.env.SAMPO_STORAGE_STATE;
if (!base || !auth)
  throw Error(
    "Set SAMPO_URL and SAMPO_STORAGE_STATE to an authenticated real Sampo review deployment.",
  );
const output = resolve(process.env.REVIEW_DIR ?? ".review/market-universe");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_PATH
    ? { executablePath: process.env.CHROMIUM_PATH }
    : {}),
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 1600, height: 1050 },
  storageState: auth,
  acceptDownloads: true,
});
const page = await context.newPage();
page.setDefaultTimeout(12000);
const errors = [],
  checks = [],
  failures = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("response", (r) => {
  if (r.status() >= 400 && r.url().startsWith(base))
    failures.push({ status: r.status(), url: new URL(r.url()).pathname });
});
try {
  await page.goto(
    base +
      "/workspaces/" +
      (process.env.SAMPO_WORKSPACE ?? "analysis-lab-20261102") +
      "?section=workspace",
  );
  await page.waitForTimeout(1200);
  if (
    await page
      .getByRole("button", { name: "Use saved workspace", exact: true })
      .count()
  )
    await page
      .getByRole("button", { name: "Use saved workspace", exact: true })
      .click();
  const app = page.getByTestId("market-universe-workbench");
  await app.waitFor();
  const nav = app.getByRole("complementary", { name: "Market navigation" }),
    search = app.getByRole("searchbox", { name: "Search market catalogue" });
  await nav.getByRole("button", { name: /All markets/ }).click();
  await app.getByRole("button", { name: "Universe", exact: true }).click();
  await page.screenshot({ animations: "disabled", path: output + "/universe.png" });
  await app
    .locator(".mu-results-heading")
    .filter({ hasText: "2,020" })
    .waitFor();
  assert.equal(
    await app
      .locator("img")
      .evaluateAll(
        (imgs) => imgs.filter((i) => i.complete && i.naturalWidth === 0).length,
      ),
    0,
  );
  checks.push("full catalogue, static logos and real host render");
  await nav.getByRole("button", { name: /^Europe / }).click();
  await app.locator(".mu-results-heading").filter({ hasText: "183" }).waitFor();
  await app
    .getByRole("checkbox", { name: "Demo coverage", exact: true })
    .uncheck();
  await app.locator(".mu-results-heading").filter({ hasText: "183" }).waitFor();
  assert.match(await app.locator("tbody").innerText(), /Not connected/);
  await app
    .getByRole("checkbox", { name: "Demo coverage", exact: true })
    .check();
  await search.fill("ASML");
  await page.waitForTimeout(100);
  await app.locator(".mu-instrument").filter({ hasText: "ASML-NA" }).click();
  await app
    .getByRole("complementary", { name: "Instrument details: ASML-NA" })
    .waitFor();
  await page.screenshot({ animations: "disabled", path: output + "/europe-tearsheet.png" });
  await page.keyboard.press("Escape");
  assert.equal(await app.locator(".mu-inspector").count(), 0);
  assert.match(await page.locator(":focus").innerText(), /ASML/);
  checks.push("Europe lookup, coverage independence, sheet and focus restore");
  await nav.getByRole("button", { name: /^Asia Pacific/ }).click();
  await app.locator(".mu-results-heading").filter({ hasText: "367" }).waitFor();
  await search.fill("Tencent");
  await page.waitForTimeout(100);
  assert.match(await app.locator("tbody").innerText(), /700-HK/);
  await nav.getByRole("button", { name: /^US & Americas/ }).click();
  await app
    .locator(".mu-etf-strip article")
    .filter({ hasText: "XLK" })
    .getByRole("button", { name: /Explore holdings/ })
    .click();
  await app.locator(".mu-results-heading").filter({ hasText: "57" }).waitFor();
  assert.match(
    await app.locator(".mu-group-context").innerText(),
    /Recorded holdings/,
  );
  checks.push("Asia lookup and dated XLK holdings");
  await nav.getByRole("button", { name: /All markets/ }).click();
  await search.fill("AAPL");
  await page.waitForTimeout(100);
  await app.getByRole("button", { name: "Watch AAPL", exact: true }).click();
  await nav.getByRole("button", { name: /Watchlist/ }).click();
  assert.match(await app.locator("tbody").innerText(), /AAPL/);
  assert.equal(await app.locator("tbody tr").count(), 1);
  checks.push("watchlist and filtered catalogue");
  await app.getByRole("button", { name: "Live coverage", exact: true }).click();
  assert.match(await app.locator("tbody").innerText(), /demo-archive/);
  await page.screenshot({ animations: "disabled", path: output + "/live.png" });
  await app
    .getByRole("button", { name: "History & backfills", exact: true })
    .click();
  assert.equal(await app.locator("tbody tr .mu-cell").count(), 13);
  await app.locator("tbody tr button.mu-cell.gap").first().click();
  assert.match(
    await app.locator(".mu-interval-detail").innerText(),
    /Confirmed gap/,
  );
  await page.screenshot({ animations: "disabled", path: output + "/history-sheet.png" });
  await page.keyboard.press("Escape");
  await app.getByRole("checkbox", { name: "Select AAPL", exact: true }).check();
  await app.getByRole("button", { name: /^Prepare backfill/ }).click();
  const dialog = page.getByRole("dialog", { name: "Prepare backfill draft" });
  await dialog.waitFor();
  await dialog.getByRole("radio", { name: /Confirmed gaps only/ }).check();
  await dialog
    .getByRole("button", { name: "Review draft →", exact: true })
    .click();
  assert.match(
    await dialog.getByRole("region", { name: "Reviewed draft" }).innerText(),
    /1 ranges prepared/,
  );
  await page.screenshot({ animations: "disabled", path: output + "/backfill.png" });
  const dlPromise = page.waitForEvent("download");
  await dialog
    .getByRole("button", { name: "Export JSON ↓", exact: true })
    .click();
  const dl = await dlPromise;
  const draft = JSON.parse(await readFile(await dl.path(), "utf8"));
  assert.equal(draft.execution, "not-submitted");
  assert.equal(draft.evidence, "demo");
  assert.equal(draft.ranges.length, 1);
  assert.equal(draft.dataset, "volatility-surfaces");
  await dialog
    .getByRole("combobox", { name: "Draft data product" })
    .selectOption("quotes");
  await dialog
    .getByRole("button", { name: "Review draft →", exact: true })
    .click();
  assert.match(
    await dialog.getByRole("region", { name: "Reviewed draft" }).innerText(),
    /0 ranges prepared/,
  );
  assert.equal(
    await dialog
      .getByRole("button", { name: "Export JSON ↓", exact: true })
      .isDisabled(),
    true,
  );
  await dialog.getByRole("radio", { name: /Full selected window/ }).check();
  await dialog.getByRole("textbox", { name: "Draft reason" }).fill("");
  await dialog
    .getByRole("button", { name: "Review draft →", exact: true })
    .click();
  assert.match(await dialog.getByRole("alert").innerText(), /reason/);
  await page.keyboard.press("Escape");
  assert.equal(
    await page.getByRole("dialog", { name: "Prepare backfill draft" }).count(),
    0,
  );
  checks.push(
    "source/product-safe gap draft, JSON export, validation and modal Escape",
  );
  await nav.getByRole("button", { name: /All markets/ }).click();
  await app
    .getByRole("button", { name: "History & backfills", exact: true })
    .click();
  await page.screenshot({ animations: "disabled", path: output + "/history.png" });
  await page.keyboard.press("Control+k");
  await page.locator("#sampo-command-search").waitFor();
  await page.keyboard.press("Escape");
  checks.push("host command palette preserved");
  await page.setViewportSize({ width: 900, height: 850 });
  await page.screenshot({ animations: "disabled", path: output + "/compact.png" });
  assert.equal(
    await app.evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
    true,
  );
  await context.emulateMedia?.({ reducedMotion: "reduce" });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await app.locator(".mu-instrument").first().click();
  assert.equal(
    await app
      .locator(".mu-inspector")
      .evaluate((e) => getComputedStyle(e).animationName),
    "none",
  );
  checks.push("compact layout, reduced motion");
  assert.deepEqual(errors, []);
  assert.deepEqual(failures, []);
  await writeFile(
    output + "/result.json",
    JSON.stringify(
      { status: "passed", checks, errors, failures, draft },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ status: "passed", checks, errors, failures }));
} catch (error) {
  await page.screenshot({ animations: "disabled", path: output + "/failure.png" });
  console.error((await page.locator("body").innerText()).slice(-5000));
  throw error;
} finally {
  await browser.close();
}
