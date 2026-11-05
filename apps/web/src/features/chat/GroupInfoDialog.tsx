import { useApolloClient, useMutation } from '@apollo/client';
import { LogOut, Pencil } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import { Input } from '@/components/Input';
import { removeConversation } from '@/lib/cacheUpdates';
import { ADD_MEMBERS, LEAVE_GROUP, RENAME_GROUP, type Conversation, type User } from '@/lib/gql';
import { UserPicker } from '../conversations/NewChatDialog';
import { useViewer } from '../session/ViewerProvider';

const messageOf = (err: unknown) =>
  (err as { graphQLErrors?: Array<{ message: string }> }).graphQLErrors?.[0]?.message ??
  'Something went wrong. Try again.';

export function GroupInfoDialog({
  conversation,
  open,
  onOpenChange,
}: {
  conversation: Conversation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const viewer = useViewer();
  const client = useApolloClient();
  const navigate = useNavigate();
  const [name, setName] = useState(conversation.title);
  const [adding, setAdding] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [renameGroup, rename] = useMutation(RENAME_GROUP);
  const [addMembers] = useMutation(ADD_MEMBERS);
  const [leaveGroup, leave] = useMutation(LEAVE_GROUP);

  useEffect(() => {
    if (open) {
      setName(conversation.title);
      setAdding(false);
      setConfirmLeave(false);
    }
  }, [open, conversation.title]);

  const dirty = name.trim() !== '' && name.trim() !== conversation.title;

  async function saveName() {
    try {
      await renameGroup({ variables: { conversationId: conversation.id, name } });
      toast.success('Group renamed');
    } catch (err) {
      toast.error(messageOf(err));
    }
  }

  async function add(user: User) {
    try {
      await addMembers({
        variables: { conversationId: conversation.id, usernames: [user.username] },
      });
      toast.success(`${user.displayName} added`);
      setAdding(false);
    } catch (err) {
      toast.error(messageOf(err));
    }
  }

  async function doLeave() {
    try {
      await leaveGroup({ variables: { conversationId: conversation.id } });
      onOpenChange(false);
      navigate('/', { replace: true });
      removeConversation(client, conversation.id);
    } catch (err) {
      toast.error(messageOf(err));
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Group info"
      description={`${conversation.members.length} members`}
    >
      <form
        className="mb-5 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (dirty) void saveName();
        }}
      >
        <div className="relative flex-1">
          <Pencil
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            aria-label="Group name"
            className="pl-10"
          />
        </div>
        <Button type="submit" variant="secondary" disabled={!dirty} loading={rename.loading}>
          Save
        </Button>
      </form>

      <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Members
      </h3>
      <ul className="mb-4 space-y-0.5">
        {conversation.members.map((m) => (
          <li key={m.id} className="flex min-h-12 items-center gap-3 rounded-xl px-1 py-1.5">
            <Avatar
              name={m.displayName}
              color={m.avatarColor}
              online={m.online || m.id === viewer.id}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {m.displayName}
                {m.id === viewer.id ? (
                  <span className="font-normal text-muted-foreground"> (you)</span>
                ) : null}
              </p>
              <p className="truncate text-xs text-muted-foreground">@{m.username}</p>
            </div>
          </li>
        ))}
      </ul>

      {adding ? (
        <div className="mb-4">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Add someone
          </h3>
          <UserPicker
            autoFocus
            selected={[]}
            excludeIds={conversation.members.map((m) => m.id)}
            onPick={(u) => void add(u)}
          />
        </div>
      ) : (
        <Button variant="secondary" className="mb-4 w-full" onClick={() => setAdding(true)}>
          Add people
        </Button>
      )}

      {confirmLeave ? (
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={() => setConfirmLeave(false)}>
            Stay
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            loading={leave.loading}
            onClick={() => void doLeave()}
          >
            Yes, leave
          </Button>
        </div>
      ) : (
        <Button variant="danger" className="w-full" onClick={() => setConfirmLeave(true)}>
          <LogOut className="size-4" /> Leave group
        </Button>
      )}
    </Dialog>
  );
}
