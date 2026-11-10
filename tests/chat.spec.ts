import { test, expect } from "@playwright/test";

test("Ask Relay live queries: greeting, role, project Q, general knowledge, unanswerable, and restricted", async ({
  page,
  browser,
  baseURL,
}) => {
  // 1. Open Landing and enter sample workspace as lead (Riya)
  await page.goto("/");
  await page.getByRole("button", { name: "Explore sample workspace" }).click();
  await expect(page.locator(".sample-tag, .workspace-banner")).toBeVisible();

  // Reconstruct so claims exist
  await page.goto("/#/reconstruct");
  await page.getByRole("button", { name: "Reconstruct Project Knowledge" }).click();
  await expect(page).toHaveURL(/knowledge/);

  // Helper to ask a question via the Ask Relay UI
  const askInUI = async (q: string) => {
    // Open drawer if not already open
    const trigger = page.locator(".ask-relay-trigger");
    if (await trigger.isVisible()) {
      await trigger.click();
    }
    await expect(page.locator(".ask-relay-drawer")).toBeVisible();

    const input = page.locator(".ask-relay-input-form input");
    await input.fill(q);
    await page.locator(".ask-relay-input-form button").click();

    // Wait until loading indicator disappears
    await expect(page.locator(".ask-msg-bubble.loading")).toHaveCount(0, { timeout: 15000 });

    // Return the latest assistant message bubble
    const lastAssistantBubble = page.locator(".ask-msg.assistant .ask-msg-bubble").last();
    await expect(lastAssistantBubble).toBeVisible();
    return lastAssistantBubble;
  };

  // Query 1: "hii"
  const q1Bubble = await askInUI("hii");
  const q1Text = await q1Bubble.innerText();
  console.log("Q1 ('hii') response:", q1Text);
  expect(q1Text.toLowerCase()).toContain("hello");

  // Query 2: "what is my role"
  const q2Bubble = await askInUI("what is my role");
  const q2Text = await q2Bubble.innerText();
  console.log("Q2 ('what is my role') response:", q2Text);
  expect(q2Text).toContain("Team Lead / Reviewer");
  expect(q2Text).toContain("Riya");

  // Query 3: "who owns the nightly digest cron job?"
  const q3Bubble = await askInUI("who owns the nightly digest cron job?");
  const q3Text = await q3Bubble.innerText();
  console.log("Q3 ('who owns the nightly digest cron job?') response:", q3Text);
  expect(q3Text.toLowerCase()).toMatch(/kabir|digest|cron/);

  // Query 4: "what is OAuth?"
  const q4Bubble = await askInUI("what is OAuth?");
  const q4Text = await q4Bubble.innerText();
  console.log("Q4 ('what is OAuth?') response:", q4Text);
  expect(q4Text).toContain("[General answer, not from your project sources]");

  // Query 5: Unanswerable project question: "What is the quantum encryption protocol in 2035?"
  const q5Bubble = await askInUI("What is the quantum encryption protocol in 2035?");
  const q5Text = await q5Bubble.innerText();
  console.log("Q5 (unanswerable) response:", q5Text);
  expect(q5Text.toLowerCase()).toMatch(/searched the permitted handover records|insufficient|does not contain/);

  // Now approve handover so Neha can access
  await page.goto("/#/review");
  const reviewCards = page.locator(".review-card");
  const count = await reviewCards.count();
  for (let i = 0; i < count; i++) {
    const card = reviewCards.nth(i);
    const btn = card.getByRole("button", { name: "Review / edit" });
    if (await btn.isVisible()) {
      await btn.click();
      const dialog = page.getByRole("dialog");
      await dialog.getByLabel("Review decision").selectOption("Accepted");
      await dialog.getByLabel("Review reason / notes").fill("Verified live test review.");
      await dialog.getByLabel(/Verification outcome/).fill("Verified checks.");
      await dialog.getByRole("button", { name: "Save review" }).click();
      await expect(dialog).toHaveCount(0);
    }
  }

  await page.getByLabel("Target audience").selectOption("incoming");
  await page.getByLabel("I confirm the included information").check();
  await page.getByRole("button", { name: "Approve Handover" }).click();
  await page.getByRole("button", { name: "Confirm approval" }).click();
  await expect(page).toHaveURL(/handover/);

  const link = await page.getByLabel("Neha’s access link").inputValue();

  // Query 6: As Neha (incoming member), ask about vendor budget
  const nehaContext = await browser.newContext({ baseURL });
  const nehaPage = await nehaContext.newPage();
  await nehaPage.goto(link);
  await expect(nehaPage.locator(".handover-banner")).toContainText("Aarav → Neha");

  const nehaTrigger = nehaPage.locator(".ask-relay-trigger");
  await nehaTrigger.click();
  await expect(nehaPage.locator(".ask-relay-drawer")).toBeVisible();

  const nehaInput = nehaPage.locator(".ask-relay-input-form input");
  await nehaInput.fill("What is the vendor contingency budget risk?");
  await nehaPage.locator(".ask-relay-input-form button").click();

  await expect(nehaPage.locator(".ask-msg-bubble.loading")).toHaveCount(0, { timeout: 15000 });
  const nehaBubble = nehaPage.locator(".ask-msg.assistant .ask-msg-bubble").last();
  const nehaText = await nehaBubble.innerText();
  console.log("Q6 (Neha restricted vendor budget) response:", nehaText);
  expect(nehaText).toContain("This information is not available for this role.");

  await nehaContext.close();
});
