import { useApolloClient, useMutation } from '@apollo/client';
import { Check, Loader2, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import { Field, Input } from '@/components/Input';
import { cn } from '@/lib/cn';
import { upsertConversation } from '@/lib/cacheUpdates';
import { CREATE_GROUP, SEARCH_USERS, START_DIRECT, type User } from '@/lib/gql';

type Tab = 'direct' | 'group';

const messageOf = (err: unknown) =>
  (err as { graphQLErrors?: Array<{ message: string }> }).graphQLErrors?.[0]?.message ??
  'Something went wrong. Try again.';

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

/** Live username search. `selected` marks results that are already picked. */
export function UserPicker({
  selected,
  onPick,
  excludeIds = [],
  autoFocus,
}: {
  selected: string[];
  onPick: (user: User) => void;
  excludeIds?: string[];
  autoFocus?: boolean;
}) {
  const client = useApolloClient();
  const [query, setQuery] = useState('');
  const debounced = useDebounced(query.trim().replace(/^@/, ''), 200);
  const [state, setState] = useState<{ loading: boolean; users: User[]; error: boolean }>({
    loading: false,
    users: [],
    error: false,
  });

  useEffect(() => {
    if (debounced.length < 2) {
      setState({ loading: false, users: [], error: false });
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: false }));
    client
      .query({ query: SEARCH_USERS, variables: { query: debounced }, fetchPolicy: 'network-only' })
      .then(
        ({ data }) =>
          !cancelled && setState({ loading: false, users: data.searchUsers, error: false }),
      )
      .catch(() => !cancelled && setState({ loading: false, users: [], error: true }));
    return () => {
      cancelled = true;
    };
  }, [debounced, client]);

  const users = state.users.filter((u) => !excludeIds.includes(u.id));

  return (
    <div>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by username"
          aria-label="Search people by username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoFocus={autoFocus}
          className="pl-10"
        />
        {state.loading ? (
          <Loader2 className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : null}
      </div>
      <ul className="mt-2 max-h-64 min-h-16 space-y-0.5 overflow-y-auto" aria-live="polite">
        {debounced.length < 2 ? (
          <li className="px-1 py-4 text-center text-sm text-muted-foreground">
            Type at least 2 letters of their username.
          </li>
        ) : state.error ? (
          <li className="px-1 py-4 text-center text-sm text-danger">Search failed. Try again.</li>
        ) : users.length === 0 && !state.loading ? (
          <li className="px-1 py-4 text-center text-sm text-muted-foreground">
            No one found for “{debounced}”.
          </li>
        ) : (
          users.map((u) => {
            const picked = selected.includes(u.id);
            return (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => onPick(u)}
                  className="flex min-h-12 w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-muted"
                >
                  <Avatar name={u.displayName} color={u.avatarColor} online={u.online} size="md" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{u.displayName}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      @{u.username}
                    </span>
                  </span>
                  {picked ? <Check className="size-4 text-brand" aria-label="Selected" /> : null}
                </button>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}

export function NewChatDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const client = useApolloClient();
  const [tab, setTab] = useState<Tab>('direct');
  const [members, setMembers] = useState<User[]>([]);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [startDirect, direct] = useMutation(START_DIRECT);
  const [createGroup, group] = useMutation(CREATE_GROUP);

  useEffect(() => {
    if (!open) {
      setTab('direct');
      setMembers([]);
      setName('');
      setError(null);
    }
  }, [open]);

  async function openDirect(user: User) {
    setError(null);
    try {
      const { data } = await startDirect({ variables: { username: user.username } });
      if (!data) return;
      upsertConversation(client, data.startDirect);
      onOpenChange(false);
      navigate(`/c/${data.startDirect.id}`);
    } catch (err) {
      setError(messageOf(err));
    }
  }

  async function submitGroup() {
    setError(null);
    try {
      const { data } = await createGroup({
        variables: { name, usernames: members.map((m) => m.username) },
      });
      if (!data) return;
      upsertConversation(client, data.createGroup);
      onOpenChange(false);
      navigate(`/c/${data.createGroup.id}`);
      toast.success(`Created “${data.createGroup.title}”`);
    } catch (err) {
      setError(messageOf(err));
    }
  }

  const toggle = (u: User) =>
    setMembers((prev) =>
      prev.some((m) => m.id === u.id) ? prev.filter((m) => m.id !== u.id) : [...prev, u],
    );

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="New chat"
      description="Find people by their exact username."
    >
      <div role="tablist" className="mb-4 grid grid-cols-2 rounded-xl bg-muted p-1">
        {(['direct', 'group'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={tab === t}
            onClick={() => {
              setTab(t);
              setError(null);
            }}
            className={cn(
              'h-10 rounded-lg text-sm font-medium transition-colors md:h-9',
              tab === t ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t === 'direct' ? 'Direct message' : 'Group'}
          </button>
        ))}
      </div>

      {tab === 'group' ? (
        <div className="mb-4 space-y-4">
          <Field label="Group name">
            {(p) => (
              <Input
                {...p}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Weekend hike"
                maxLength={60}
              />
            )}
          </Field>
          {members.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5" aria-label="Selected people">
              {members.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => toggle(m)}
                    aria-label={`Remove ${m.displayName}`}
                    className="inline-flex h-8 items-center gap-1.5 rounded-full bg-muted pl-1 pr-2.5 text-sm hover:bg-border/60"
                  >
                    <Avatar name={m.displayName} color={m.avatarColor} size="sm" />
                    {m.displayName.split(' ')[0]}
                    <X className="size-3.5 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <UserPicker
        autoFocus
        selected={members.map((m) => m.id)}
        onPick={tab === 'direct' ? (u) => void openDirect(u) : toggle}
      />

      {error ? (
        <p role="alert" className="mt-3 rounded-xl bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {tab === 'group' ? (
        <Button
          className="mt-4 w-full"
          disabled={!name.trim() || members.length === 0}
          loading={group.loading}
          onClick={() => void submitGroup()}
        >
          Create group
          {members.length > 0
            ? ` with ${members.length} ${members.length === 1 ? 'person' : 'people'}`
            : ''}
        </Button>
      ) : direct.loading ? (
        <p className="mt-3 text-center text-sm text-muted-foreground">Opening chat…</p>
      ) : null}
    </Dialog>
  );
}
