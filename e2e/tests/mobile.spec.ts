import { expect, test } from '@playwright/test';
import { newUser, send, startDirect, unique } from './helpers';

const PHONE = { width: 390, height: 844 };

test('phone layout: one pane at a time, with back navigation', async ({ browser }) => {
  const a = await newUser(browser, unique('alice'), PHONE);
  const b = await newUser(browser, unique('bob'), PHONE);

  await startDirect(a.page, b.username);
  await send(a.page, 'ping');
  // Chat is full screen: the sidebar is hidden.
  await expect(a.page.getByRole('heading', { name: 'Chats' })).toBeHidden();
  await a.page.getByRole('link', { name: 'Back to chats' }).click();
  await expect(a.page.getByRole('heading', { name: 'Chats' })).toBeVisible();

  // Bob's list shows the chat; opening it fills the screen.
  await b.page.getByRole('link', { name: /alice/i }).click();
  await expect(b.page.getByText('ping')).toBeVisible();

  // Nothing overflows horizontally and the main tap target is at least 44px.
  for (const { page } of [a, b]) {
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  }
  const sendButton = await b.page.getByRole('button', { name: 'Send message' }).boundingBox();
  expect(sendButton!.width).toBeGreaterThanOrEqual(44);
  expect(sendButton!.height).toBeGreaterThanOrEqual(44);

  await a.context.close();
  await b.context.close();
});
