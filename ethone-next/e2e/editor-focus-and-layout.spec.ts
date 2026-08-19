import { test, expect } from "@playwright/test";
import { signInByPassword, requireAuthEnv } from "./auth-helpers";

test.setTimeout(120000);

test("editor focus and full-height layout on notes, tasks and brain", async ({ page, request }) => {
  const { email, password } = requireAuthEnv();
  await signInByPassword(page, request, email, password);
  await page.setViewportSize({ width: 1280, height: 800 });

  // Notes: title focus + rich editor fills height
  await page.goto("/notes");
  await page.waitForLoadState("networkidle");

  const title = page.getByTestId("note-title-input");
  await title.click();
  await title.fill("Test focus Obsidian");
  await page.screenshot({ path: "e2e/screenshots/notes-title-focus.png" });

  const editor = page.getByTestId("rich-editor");
  await editor.click();
  await editor.fill("Ligne 1\nLigne 2\nLigne 3");
  await page.screenshot({ path: "e2e/screenshots/notes-editor-focus.png" });

  // Rich editor should be at least 280px tall (full-height within panel)
  const editorBox = await editor.boundingBox();
  expect(editorBox?.height).toBeGreaterThan(280);

  // Focus ring must not be the old emerald green
  const titleBoxShadow = await title.evaluate((el) => window.getComputedStyle(el).boxShadow);
  expect(titleBoxShadow).not.toContain("rgb(16, 185, 129)");
  expect(titleBoxShadow).not.toContain("rgb(52, 211, 153)");

  // Tasks: quick add focus
  await page.goto("/tasks");
  await page.waitForLoadState("networkidle");
  const taskInput = page.getByTestId("new-task-input");
  await taskInput.click();
  await taskInput.fill("Tester la zone de saisie");
  await page.screenshot({ path: "e2e/screenshots/tasks-input-focus.png" });

  const taskFormBoxShadow = await taskInput.evaluate((el) => {
    const form = el.closest("form");
    return form ? window.getComputedStyle(form).boxShadow : "";
  });
  expect(taskFormBoxShadow).not.toContain("rgb(16, 185, 129)");
  expect(taskFormBoxShadow).not.toContain("rgb(52, 211, 153)");

  // Brain: textarea focus
  await page.goto("/brain");
  await page.waitForLoadState("networkidle");
  const brainInput = page.locator('textarea[data-testid="brain-input"]').first();
  await brainInput.click();
  await brainInput.fill("Comment fonctionne le focus ?");
  await page.screenshot({ path: "e2e/screenshots/brain-input-focus.png" });

  const brainBoxShadow = await brainInput.evaluate((el) => {
    const wrapper = el.parentElement;
    return wrapper ? window.getComputedStyle(wrapper).boxShadow : "";
  });
  expect(brainBoxShadow).not.toContain("rgb(16, 185, 129)");
  expect(brainBoxShadow).not.toContain("rgb(52, 211, 153)");
});
