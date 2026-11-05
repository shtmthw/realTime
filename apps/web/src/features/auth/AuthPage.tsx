import { useMutation } from '@apollo/client';
import { Eye, EyeOff } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/Button';
import { Field, Input } from '@/components/Input';
import { Logo } from '@/components/Logo';
import { cn } from '@/lib/cn';
import { ME, SIGN_IN, SIGN_UP } from '@/lib/gql';
import { validateSignIn, validateSignUp } from './validation';

type Mode = 'signin' | 'signup';
type Errors = Record<string, string | undefined>;

/** Pulls a friendly message and (when the server named one) the field out of an Apollo error. */
function describeError(err: unknown): { field?: string; message: string } {
  const gqlError = (
    err as { graphQLErrors?: Array<{ message: string; extensions?: { field?: string } }> }
  ).graphQLErrors?.[0];
  if (gqlError) return { message: gqlError.message, field: gqlError.extensions?.field };
  return { message: 'Can’t reach the server. Check your connection and try again.' };
}

export function AuthPage() {
  const [mode, setMode] = useState<Mode>('signin');
  const [values, setValues] = useState({ identifier: '', username: '', email: '', password: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [signIn, signInState] = useMutation(SIGN_IN);
  const [signUp, signUpState] = useMutation(SIGN_UP);
  const loading = signInState.loading || signUpState.loading;

  const set = (key: keyof typeof values) => (e: { target: { value: string } }) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setFormError(null);
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setErrors({});
    setFormError(null);
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;

    const found: Errors = mode === 'signin' ? validateSignIn(values) : validateSignUp(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    try {
      if (mode === 'signin') {
        await signIn({
          variables: { input: { identifier: values.identifier.trim(), password: values.password } },
          update: (cache, { data }) =>
            data && cache.writeQuery({ query: ME, data: { me: data.signIn } }),
        });
      } else {
        await signUp({
          variables: {
            input: {
              username: values.username.trim(),
              email: values.email.trim(),
              password: values.password,
            },
          },
          update: (cache, { data }) =>
            data && cache.writeQuery({ query: ME, data: { me: data.signUp } }),
        });
      }
    } catch (err) {
      const { field, message } = describeError(err);
      if (field && field in values) setErrors({ [field]: message });
      else setFormError(message);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10 pt-[max(2.5rem,env(safe-area-inset-top))]">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size={48} />
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === 'signin'
              ? 'Sign in to pick up your conversations.'
              : 'Takes a few seconds. No spam, ever.'}
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Account"
          className="mb-5 grid grid-cols-2 rounded-xl bg-muted p-1"
        >
          {(['signin', 'signup'] as const).map((m) => (
            <button
              key={m}
              role="tab"
              type="button"
              aria-selected={mode === m}
              onClick={() => switchMode(m)}
              className={cn(
                'h-10 rounded-lg text-sm font-medium transition-colors md:h-9',
                mode === m
                  ? 'bg-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {m === 'signin' ? 'Sign in' : 'Sign up'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} noValidate className="space-y-4">
          {mode === 'signin' ? (
            <Field label="Username or email" error={errors.identifier}>
              {(p) => (
                <Input
                  {...p}
                  value={values.identifier}
                  onChange={set('identifier')}
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoFocus
                />
              )}
            </Field>
          ) : (
            <>
              <Field
                label="Username"
                error={errors.username}
                hint="3–20 letters, numbers or underscores. This is how people find you."
              >
                {(p) => (
                  <Input
                    {...p}
                    value={values.username}
                    onChange={set('username')}
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    autoFocus
                  />
                )}
              </Field>
              <Field label="Email" error={errors.email}>
                {(p) => (
                  <Input
                    {...p}
                    type="email"
                    value={values.email}
                    onChange={set('email')}
                    autoComplete="email"
                  />
                )}
              </Field>
            </>
          )}

          <Field
            label="Password"
            error={errors.password}
            hint={mode === 'signup' ? 'At least 8 characters.' : undefined}
          >
            {(p) => (
              <div className="relative">
                <Input
                  {...p}
                  type={showPassword ? 'text' : 'password'}
                  value={values.password}
                  onChange={set('password')}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  className="pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-1 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            )}
          </Field>

          {formError ? (
            <p role="alert" className="rounded-xl bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
              {formError}
            </p>
          ) : null}

          <Button type="submit" loading={loading} className="w-full">
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </Button>
        </form>
      </div>
    </div>
  );
}
