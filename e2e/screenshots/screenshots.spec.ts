import { fileURLToPath } from 'node:url';
import { expect, test, type Browser, type Page } from '@playwright/test';

const OUT = fileURLToPath(new URL('../../docs/screenshots/', import.meta.url));
const DESKTOP = { width: 1280, height: 800 };
const PHONE = { width: 390, height: 844 };

type Scheme = 'light' | 'dark';

async function signIn(
  browser: Browser,
  who: string,
  scheme: Scheme,
  viewport = DESKTOP,
  scale = 2,
) {
  const context = await browser.newContext({
    viewport,
    colorScheme: scheme,
    deviceScaleFactor: scale,
  });
  const page = await context.newPage();
  await page.goto('/');
  await page.getByLabel('Username or email').fill(who);
  await page.getByLabel('Password', { exact: true }).fill('password123');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Chats' })).toBeVisible();
  return { context, page };
}

const settle = async (page: Page, ms = 600) => {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(ms);
};

const chat = (page: Page, title: RegExp) =>
  page.getByRole('navigation', { name: 'Conversations' }).getByRole('link', { name: title });

test('capture README screenshots', async ({ browser }) => {
  // People who are "online" while we take the pictures.
  const bob = await signIn(browser, 'bob', 'light', DESKTOP, 1);
  const carol = await signIn(browser, 'carol', 'light', DESKTOP, 1);
  const dave = await signIn(browser, 'dave', 'light', DESKTOP, 1);
  await chat(dave.page, /Weekend hike/).click();

  // Sign-in screen
  for (const scheme of ['light', 'dark'] as const) {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      colorScheme: scheme,
      deviceScaleFactor: 2,
    });
    const page = await ctx.newPage();
    await page.goto('/');
    await page.getByRole('tab', { name: 'Sign up' }).click();
    await settle(page);
    await page.screenshot({ path: `${OUT}auth-${scheme}.png` });
    await ctx.close();
  }

  // Pass 1 (before anything is read): direct message + phone views show the unread badge.
  for (const scheme of ['light', 'dark'] as const) {
    const desk = await signIn(browser, 'alice', scheme);
    await chat(desk.page, /Bob Carter/).click();
    await expect(desk.page.getByText('Absolutely, send me the link')).toBeVisible();
    await settle(desk.page);
    await desk.page.screenshot({ path: `${OUT}desktop-chat-${scheme}.png` });
    await desk.context.close();

    const phone = await signIn(browser, 'alice', scheme, PHONE, 3);
    await settle(phone.page);
    await phone.page.screenshot({ path: `${OUT}mobile-list-${scheme}.png` });
    await chat(phone.page, /Bob Carter/).click();
    await expect(phone.page.getByText('Absolutely, send me the link')).toBeVisible();
    await settle(phone.page);
    await phone.page.screenshot({ path: `${OUT}mobile-chat-${scheme}.png` });
    await phone.context.close();
  }

  // Pass 2: group chat with someone typing, and the new-chat dialog.
  for (const scheme of ['light', 'dark'] as const) {
    const desk = await signIn(browser, 'alice', scheme);
    await chat(desk.page, /Weekend hike/).click();
    await expect(desk.page.getByText('Trail map is in the shared folder')).toBeVisible();
    await dave.page
      .getByLabel('Message', { exact: true })
      .pressSequentially('Meet at the trailhead', { delay: 20 });
    await expect(desk.page.getByText(/is typing/)).toBeVisible();
    await settle(desk.page, 300);
    await desk.page.screenshot({ path: `${OUT}desktop-group-${scheme}.png` });
    await dave.page.getByLabel('Message', { exact: true }).fill('');

    if (scheme === 'light') {
      await desk.page.getByRole('button', { name: 'New chat' }).first().click();
      await desk.page.getByLabel('Search people by username').fill('er');
      await expect(desk.page.getByRole('button', { name: /@erin/ })).toBeVisible();
      await settle(desk.page, 300);
      await desk.page.screenshot({ path: `${OUT}new-chat-light.png` });
    }
    await desk.context.close();
  }

  await bob.context.close();
  await carol.context.close();
  await dave.context.close();
});
