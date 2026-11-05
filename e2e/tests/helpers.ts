import { expect, type Browser, type Page } from '@playwright/test';

export const unique = (name: string) => `${name}${Math.random().toString(36).slice(2, 7)}`;

export async function signUp(page: Page, username: string, password = 'password123') {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Sign up' }).click();
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Email').fill(`${username}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Chats' })).toBeVisible();
}

/** A fresh browser context (own cookies) with a page that is already signed up. */
export async function newUser(
  browser: Browser,
  username: string,
  viewport?: { width: number; height: number },
) {
  const context = await browser.newContext({ viewport: viewport ?? { width: 1100, height: 760 } });
  const page = await context.newPage();
  await signUp(page, username);
  return { context, page, username };
}

export async function startDirect(page: Page, username: string) {
  await page.getByRole('button', { name: 'New chat' }).first().click();
  await page.getByLabel('Search people by username').fill(username.slice(0, 6));
  await page.getByRole('button', { name: new RegExp(`@${username}`) }).click();
  await expect(
    page.getByRole('log', { name: 'Messages' }).or(page.getByText(/Say hi to/)),
  ).toBeVisible();
}

export async function send(page: Page, text: string) {
  const box = page.getByLabel('Message', { exact: true });
  await box.fill(text);
  await box.press('Enter');
}
