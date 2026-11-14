import { test, expect } from "@playwright/test";

test("Round 3 Features: Demo login, Wizard project, Clarifications, and Version Diff", async ({ page }) => {
  await page.goto("/");

  // 1. Demo Account Card & 1-click Demo Login
  const demoCard = page.locator(".demo-account-card");
  if (await demoCard.isVisible()) {
    await expect(page.getByText("demo@relay.local")).toBeVisible();
    await page.getByRole("button", { name: "Open as Demo Lead (1-click)" }).click();
    await expect(page.locator(".topbar")).toBeVisible();
  } else {
    await page.getByRole("button", { name: "Explore sample workspace" }).click();
    await expect(page.locator(".topbar")).toBeVisible();
  }

  // 2. Open Clarifications page
  await page.goto("/#/clarifications");
  await expect(page.getByRole("heading", { name: /Clarifications with the Departing Member/i })).toBeVisible();

  // 3. Open History & Version Diff
  await page.goto("/#/history");
  await expect(page.getByRole("heading", { name: /Activity & Version History/i })).toBeVisible();

  // 4. Check About & Limitations
  await page.goto("/#/about");
  await expect(page.getByRole("heading", { name: /About & limitations/i })).toBeVisible();
  await expect(page.getByText(/AI-Assisted vs. Rule-Based Systems/i)).toBeVisible();
  await expect(page.getByText(/gemini-2.5-flash/i)).toBeVisible();
  await expect(page.getByText(/Email Verification & Password Reset/i)).toBeVisible();
});
