import { expect, test } from '@playwright/test';
import { signUp, unique } from './helpers';

test('validates the form and reports a wrong password', async ({ page }) => {
  const name = unique('dana');
  await signUp(page, name);

  await page.getByRole('link', { name: /@/ }).click();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();

  // Client-side validation
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByText('Enter your username or email')).toBeVisible();

  // Wrong password: the server's message is shown, with no hint about which part was wrong
  await page.getByLabel('Username or email').fill(name);
  await page.getByLabel('Password', { exact: true }).fill('wrong-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Incorrect username/email or password');

  // Correct password signs back in
  await page.getByLabel('Password', { exact: true }).fill('password123');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Chats' })).toBeVisible();
});

test('rejects a username that is already taken', async ({ page, browser }) => {
  const name = unique('erin');
  await signUp(page, name);
  const other = await browser.newContext();
  const p = await other.newPage();
  await p.goto('/');
  await p.getByRole('tab', { name: 'Sign up' }).click();
  await p.getByLabel('Username').fill(name);
  await p.getByLabel('Email').fill('different@example.com');
  await p.getByLabel('Password', { exact: true }).fill('password123');
  await p.getByRole('button', { name: 'Create account' }).click();
  await expect(p.getByText('That username is taken')).toBeVisible();
  await other.close();
});
