# Plan: Debug and fix remaining auth/UI issues

**Goal:** Make add user dialog show existing users, fix group creation to work when logged in, ensure logo padding is visible.

**Repo:** `/home/matthew/realTime`

## Issues to fix

### 1. Add user dialog doesn't show existing users
- **Root cause:** The dialog uses `GET_USERS` which requires auth. If auth isn't working properly, it may fail. Also the dialog might need to refetch when opened.
- **Fix:**
  - Refetch users when opening the add user dialog
  - Add better loading/error states
  - Check if the query is actually running with auth headers

### 2. Group creation says "you are not logged in" when logged in
- **Root cause:** Token not being sent/verified properly. Auth flow has issues.
- **Fix:**
  - Make verifyToken more defensive (handle missing JWT_SECRET, different token formats)
  - Ensure server context properly extracts userID
  - In main.jsx, ensure headers are sent correctly
  - In auth.jsx, ensure token is stored properly

### 3. Logo padding not visible
- **Root cause:** Padding might be overridden or not enough
- **Fix:** Increase padding even more, use different approach (padding on container instead of margin)

## Files to change

- `client/Client-GraphQL-Chat/src/pages/welcomeScreen.jsx` — increase padding significantly
- `client/Client-GraphQL-Chat/src/pages/side.jsx` — refetch users when opening add user dialog
- `client/Client-GraphQL-Chat/src/main.jsx` — ensure auth headers
- `project/lib/auth.js` — make verifyToken more robust
- `project/server.js` — ensure context handling
- `client/Client-GraphQL-Chat/src/pages/auth.jsx` — debug token storage

## Implementation details

1. **WelcomeScreen**: Use larger padding on container and avatar
2. **Sidebar add user dialog**: Add `refetchUsers()` in onClick of add user button
3. **Auth**: Ensure token is stored, and App reads it
4. **Server**: Make verifyToken handle edge cases, ensure context is always an object

## Validation

- Logo has visible padding
- Add user dialog shows existing users when opened
- Login, then create a group - should work without "not logged in" error

## Open questions

None - these are debugging fixes based on the reported issues.

