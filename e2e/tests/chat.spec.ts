import { expect, test } from '@playwright/test';
import { newUser, send, startDirect, unique } from './helpers';

test('two people chat in realtime without reloading', async ({ browser }) => {
  const a = await newUser(browser, unique('alice'));
  const b = await newUser(browser, unique('bob'));

  // Alice starts a chat with Bob and says hello.
  await startDirect(a.page, b.username);
  await send(a.page, 'hello from alice');
  await expect(
    a.page.getByRole('log', { name: 'Messages' }).getByText('hello from alice'),
  ).toBeVisible();

  // Bob never reloaded: the new chat, preview and unread badge simply appear.
  const bobsChat = b.page
    .getByRole('navigation', { name: 'Conversations' })
    .getByRole('link', { name: /alice/i });
  await expect(bobsChat).toBeVisible();
  await expect(bobsChat).toContainText('hello from alice');
  await expect(bobsChat.getByLabel('1 unread')).toBeVisible();

  // Opening it shows the message and clears the badge.
  await bobsChat.click();
  await expect(
    b.page.getByRole('log', { name: 'Messages' }).getByText('hello from alice'),
  ).toBeVisible();
  await expect(bobsChat.getByLabel(/unread/)).toHaveCount(0);

  // Bob replies and Alice sees it instantly, in the chat she already has open.
  await send(b.page, 'hi alice!');
  await expect(a.page.getByRole('log', { name: 'Messages' }).getByText('hi alice!')).toBeVisible();

  // Messages in the open chat don't create unread badges.
  await expect(
    a.page.getByRole('navigation', { name: 'Conversations' }).getByLabel(/unread/),
  ).toHaveCount(0);

  // Typing indicator reaches the other person.
  await b.page.getByLabel('Message', { exact: true }).pressSequentially('typing now');
  await expect(a.page.getByText(/is typing/)).toBeVisible();

  // Presence: Bob is online from Alice's point of view.
  await expect(a.page.getByRole('region', { name: /Chat with/ }).getByText('Online')).toBeVisible();

  await a.context.close();
  await b.context.close();
});

test('group chats reach everyone and show unread counts', async ({ browser }) => {
  const a = await newUser(browser, unique('alice'));
  const b = await newUser(browser, unique('bob'));
  const c = await newUser(browser, unique('carol'));

  await a.page.getByRole('button', { name: 'New chat' }).first().click();
  await a.page.getByRole('tab', { name: 'Group' }).click();
  await a.page.getByLabel('Group name').fill('Weekend plans');
  for (const u of [b, c]) {
    await a.page.getByLabel('Search people by username').fill(u.username.slice(0, 6));
    await a.page.getByRole('button', { name: new RegExp(`@${u.username}`) }).click();
  }
  await a.page.getByRole('button', { name: /Create group with 2 people/ }).click();
  await expect(a.page.getByRole('heading', { name: 'Weekend plans' })).toBeVisible();

  // The others are added live.
  for (const u of [b, c]) {
    await expect(
      u.page
        .getByRole('navigation', { name: 'Conversations' })
        .getByRole('link', { name: /Weekend plans/ }),
    ).toBeVisible();
  }

  await send(a.page, 'who is in?');
  const carolsRow = c.page
    .getByRole('navigation', { name: 'Conversations' })
    .getByRole('link', { name: /Weekend plans/ });
  await expect(carolsRow.getByLabel('1 unread')).toBeVisible();

  await carolsRow.click();
  await send(c.page, 'me!');
  await expect(a.page.getByRole('log', { name: 'Messages' }).getByText('me!')).toBeVisible();
  await expect(
    b.page
      .getByRole('navigation', { name: 'Conversations' })
      .getByRole('link', { name: /Weekend plans/ })
      .getByLabel('2 unread'),
  ).toBeVisible();

  await a.context.close();
  await b.context.close();
  await c.context.close();
});

test('history survives a reload and pages in earlier messages', async ({ browser }) => {
  const a = await newUser(browser, unique('alice'));
  const b = await newUser(browser, unique('bob'));
  await startDirect(a.page, b.username);
  for (let i = 1; i <= 40; i++) {
    await send(a.page, `message ${i}`);
    if (i % 25 === 0) await a.page.waitForTimeout(10_500); // stay under the 30 messages / 10s limit
  }
  await expect(a.page.getByRole('log').getByText('message 40', { exact: true })).toBeVisible();

  await a.page.reload();
  await expect(a.page.getByRole('heading', { name: 'Chats' })).toBeVisible(); // still signed in (cookie)
  await a.page.getByRole('navigation', { name: 'Conversations' }).getByRole('link').first().click();
  const log = a.page.getByRole('log', { name: 'Messages' });
  await expect(log.getByText('message 40', { exact: true })).toBeVisible();

  // Scrolling to the top loads the earlier page.
  await log.evaluate((el) => (el.scrollTop = 0));
  await expect(log.getByText('message 1', { exact: true })).toBeVisible();

  await a.context.close();
  await b.context.close();
});
