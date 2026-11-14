import { test, expect } from "@playwright/test";

test.describe("Production Live Acceptance Suite", () => {
  test("1. Landing page signed out: zero console errors, zero failed requests, zero state calls", async ({ page, context }) => {
    await context.clearCookies();
    const consoleErrors: string[] = [];
    const failedRequests: string[] = [];
    const apiCalls: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("response", (res) => {
      if (res.status() >= 400) failedRequests.push(`${res.status()} ${res.url()}`);
    });
    page.on("request", (req) => {
      if (req.url().includes("/api/")) apiCalls.push(req.url());
    });

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Knowledge handover for teams" })).toBeVisible();

    expect(consoleErrors).toEqual([]);
    expect(failedRequests).toEqual([]);
    expect(apiCalls.filter((u) => u.includes("/api/state"))).toEqual([]);
    await expect(page.locator(".storage-warning")).toHaveCount(0);
  });

  test("2. Invalid access code: reports plain error message without crash", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/");
    await page.getByLabel("Handover access code").fill("INVALID12345");
    await page.getByRole("button", { name: "Open shared handover" }).click();

    // Verify exact error message
    const warning = page.locator(".storage-warning");
    await expect(warning).toBeVisible();
    await expect(warning).toContainText("Invalid or revoked access. Retry connection");
  });

  test("3. Sign in as Demo Lead: authenticates and loads project workspace", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/");
    await page.getByRole("button", { name: "Sign in as Demo Lead" }).click();

    await expect(page.locator(".topbar")).toBeVisible();
    await expect(page.getByRole("button", { name: "Riya Sharma" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Keep the context. Move forward." })).toBeVisible();
  });

  test("4. Explore sample workspace: opens isolated sample workspace", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/");
    await page.getByRole("button", { name: "Explore sample workspace" }).click();

    await expect(page.locator(".topbar")).toBeVisible();
    await expect(page.locator(".sample-tag")).toContainText("Sample");
    await expect(page.getByText("CampusConnect").first()).toBeVisible();
  });

  test("5. Create organisation & Project Setup Wizard: creates custom isolated project", async ({ page, context }) => {
    await context.clearCookies();
    const uniqueEmail = `admin-${Date.now()}@relaytest.org`;

    await page.goto("/");
    await page.getByRole("button", { name: "Create your organisation" }).click();

    const modal = page.locator(".auth-modal");
    await expect(modal).toBeVisible();

    await page.getByLabel(/Full Name/i).fill("Test Founder");
    await page.getByLabel(/Organisation Name/i).fill("NovaTech Labs");
    await page.getByLabel(/Work Email/i).fill(uniqueEmail);
    await page.getByLabel(/Password/i).fill("SecurePassword2026!");

    await modal.getByRole("button", { name: /Create Account & Org/i }).click();

    // Wizard opens
    await expect(page.getByRole("heading", { name: "New Handover Project" })).toBeVisible();
    await page.getByLabel(/Project Name/i).fill("Core Billing Engine");
    await page.getByLabel(/Project Code/i).fill("CBE");
    await page.getByRole("button", { name: "Next" }).click();

    await page.getByLabel(/Departing Person's Name/i).fill("Sarah Jenkins");
    await page.getByRole("button", { name: "Next" }).click();

    await page.getByLabel(/Incoming Person's Name/i).fill("Marcus Chen");
    await page.getByRole("button", { name: "Next" }).click();

    await page.getByRole("button", { name: /Create & Open Project/i }).click();

    // Verify workspace loaded with dynamic project metadata
    await expect(page.locator(".topbar")).toBeVisible();
    await expect(page.locator(".project-switch")).toContainText("Core Billing Engine");
  });

  test("6. Full Handover Journey: approve, open as incoming, acknowledge", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/");
    await page.getByRole("button", { name: "Sign in as Demo Lead" }).click();
    await expect(page.locator(".topbar")).toBeVisible();
    await expect(page.getByRole("button", { name: "Riya Sharma" })).toBeVisible();

    // Navigate to Review
    await page.goto("/#/review");
    await expect(page.getByRole("heading", { name: "Your judgment makes it a handover." })).toBeVisible();

    // Review any pending claim
    const editBtn = page.getByRole("button", { name: "Review / edit" }).first();
    if (await editBtn.isVisible()) {
      await editBtn.click();
      const dialog = page.getByRole("dialog");
      await dialog.getByLabel("Review decision").selectOption("Accepted");
      await dialog.getByLabel("Review reason / notes").fill("Verified by team lead.");
      await dialog.getByRole("button", { name: "Save review" }).click();
    }

    // Approve handover
    await page.getByLabel("Target audience").selectOption("incoming");
    await page.getByLabel("I confirm the included information is appropriate for this audience.").check();
    await page.getByRole("button", { name: "Approve Handover" }).click();

    const confirmModal = page.getByRole("dialog");
    await confirmModal.getByRole("button", { name: "Confirm approval" }).click();

    // Now on Handover page
    await expect(page).toHaveURL(/handover/);
    await expect(page.getByText("Approved · v")).toBeVisible();

    // One-click Incoming Member launch
    const openIncomingBtn = page.getByRole("link", { name: "Open as incoming member" });
    await expect(openIncomingBtn).toBeVisible();
    const incomingUrl = await openIncomingBtn.getAttribute("href");
    expect(incomingUrl).toBeTruthy();

    // Open incoming view
    const incognitoPage = await context.newPage();
    await incognitoPage.goto(incomingUrl!);

    await expect(incognitoPage.getByText(/Viewing as Incoming Developer/i)).toBeVisible();

    // Acknowledge receipt
    const ackBtn = incognitoPage.getByRole("button", { name: /Acknowledge receipt|Re-acknowledge/i });
    if (await ackBtn.isVisible() && await ackBtn.isEnabled()) {
      await ackBtn.click();
      const ackDialog = incognitoPage.getByRole("dialog");
      await ackDialog.getByRole("button", { name: "Confirm receipt" }).click();
      await expect(incognitoPage.getByRole("button", { name: "Receipt acknowledged" })).toBeDisabled();
    }

    await incognitoPage.close();
  });

  test("7. Refresh on deep link: persists authenticated state with zero errors", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/");
    await page.getByRole("button", { name: "Sign in as Demo Lead" }).click();
    await expect(page.locator(".topbar")).toBeVisible();
    await expect(page.getByRole("button", { name: "Riya Sharma" })).toBeVisible();

    // Go to deep link
    await page.goto("/#/knowledge");
    await expect(page.getByRole("heading", { name: "The project, reconstructed." })).toBeVisible();

    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    // Refresh deep link
    await page.reload();
    await expect(page.getByRole("heading", { name: "The project, reconstructed." })).toBeVisible();
    await expect(page.locator(".storage-warning")).toHaveCount(0);
    expect(consoleErrors).toEqual([]);
  });
});
