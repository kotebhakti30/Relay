import { test, expect } from "@playwright/test";

test("Landing page signed-out: asserts zero failed network requests, zero error banners, and no /api/state calls", async ({ page, context }) => {
  // Ensure completely clean signed-out session
  await context.clearCookies();

  const failedRequests: { url: string; status: number }[] = [];
  const apiCalls: string[] = [];
  const consoleErrors: string[] = [];

  page.on("request", (req) => {
    const url = req.url();
    if (url.includes("/api/")) {
      apiCalls.push(url);
    }
  });

  page.on("response", (res) => {
    if (res.status() >= 400) {
      failedRequests.push({ url: res.url(), status: res.status() });
    }
  });

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  // Navigate to landing page
  await page.goto("/");

  // Wait for the main entry screen to be rendered
  await expect(page.getByRole("heading", { name: "Knowledge handover for teams" })).toBeVisible();

  // 1. Assert no state or workspace API calls were triggered on initial landing
  const stateCalls = apiCalls.filter((url) => url.includes("/api/state"));
  expect(stateCalls).toEqual([]);

  // 2. Assert no network request failed
  expect(failedRequests).toEqual([]);

  // 3. Assert no console error was emitted
  expect(consoleErrors).toEqual([]);

  // 4. Assert error banner is NOT visible
  const errorBanner = page.locator(".storage-warning");
  await expect(errorBanner).toHaveCount(0);

  // 5. Assert key landing buttons are visible
  await expect(page.getByRole("button", { name: "Sign in as Demo Lead" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Explore sample workspace" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create your organisation" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
});
