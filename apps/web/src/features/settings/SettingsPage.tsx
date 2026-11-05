import { useMutation } from '@apollo/client';
import { ArrowLeft, LogOut, Monitor, Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Field, Input } from '@/components/Input';
import { cn } from '@/lib/cn';
import { resetSession } from '@/lib/apollo';
import { SIGN_OUT, UPDATE_PROFILE } from '@/lib/gql';
import { useThemePreference, type ThemePreference } from '@/lib/theme';
import { useViewer } from '../session/ViewerProvider';

const COLORS = [
  '#6366f1',
  '#0ea5e9',
  '#14b8a6',
  '#22c55e',
  '#eab308',
  '#f97316',
  '#ec4899',
  '#a855f7',
];

const THEMES: Array<{ value: ThemePreference; label: string; icon: typeof Sun }> = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
];

export function SettingsPage() {
  const viewer = useViewer();
  const [theme, setTheme] = useThemePreference();
  const [displayName, setDisplayName] = useState(viewer.displayName);
  const [color, setColor] = useState(viewer.avatarColor);
  const [updateProfile, update] = useMutation(UPDATE_PROFILE);
  const [signOut, out] = useMutation(SIGN_OUT);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    (displayName.trim() !== viewer.displayName && displayName.trim() !== '') ||
    color !== viewer.avatarColor;

  async function save() {
    setError(null);
    try {
      await updateProfile({ variables: { input: { displayName, avatarColor: color } } });
      toast.success('Profile updated');
    } catch (err) {
      setError(
        (err as { graphQLErrors?: Array<{ message: string }> }).graphQLErrors?.[0]?.message ??
          'Couldn’t save. Try again.',
      );
    }
  }

  async function logout() {
    try {
      await signOut();
    } finally {
      await resetSession();
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-1 border-b border-border bg-background px-2 pt-[env(safe-area-inset-top)] md:px-6">
        <Link
          to="/"
          aria-label="Back to chats"
          className="inline-flex size-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted md:hidden"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="px-2 text-base font-semibold md:px-0">Settings</h1>
      </header>

      <div className="mx-auto max-w-lg space-y-8 px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:px-6">
        <section aria-labelledby="profile-heading" className="space-y-4">
          <h2
            id="profile-heading"
            className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
          >
            Profile
          </h2>
          <div className="flex items-center gap-4">
            <Avatar name={displayName || viewer.username} color={color} size="lg" />
            <div className="min-w-0">
              <p className="truncate font-medium">@{viewer.username}</p>
              <p className="truncate text-sm text-muted-foreground">{viewer.email}</p>
            </div>
          </div>
          <Field label="Display name" error={error}>
            {(p) => (
              <Input
                {...p}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={40}
              />
            )}
          </Field>
          <div>
            <p className="mb-2 text-sm font-medium">Avatar color</p>
            <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Avatar color">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={color === c}
                  aria-label={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    'size-9 rounded-full ring-offset-2 ring-offset-background transition-shadow',
                    color === c && 'ring-2 ring-foreground',
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <Button disabled={!dirty} loading={update.loading} onClick={() => void save()}>
            Save changes
          </Button>
        </section>

        <section aria-labelledby="appearance-heading" className="space-y-3">
          <h2
            id="appearance-heading"
            className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
          >
            Appearance
          </h2>
          <div
            role="radiogroup"
            aria-label="Theme"
            className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1"
          >
            {THEMES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={theme === value}
                onClick={() => setTheme(value)}
                className={cn(
                  'inline-flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors md:h-9',
                  theme === value
                    ? 'bg-background shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="size-4" /> {label}
              </button>
            ))}
          </div>
        </section>

        <section className="border-t border-border pt-6">
          <Button
            variant="danger"
            loading={out.loading}
            onClick={() => void logout()}
            className="w-full"
          >
            <LogOut className="size-4" /> Sign out
          </Button>
        </section>
      </div>
    </div>
  );
}
