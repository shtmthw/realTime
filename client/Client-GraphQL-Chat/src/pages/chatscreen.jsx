import { useParams, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useLazyQuery } from '@apollo/client';
import { useState, useEffect, useRef } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Avatar,
  Typography,
  TextField,
  Button,
  Stack,
  CircularProgress,
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import ChatWindow from '../components/chatWindow';
import {
  GET_ME,
  GET_GROUP,
  GET_PERSONAL_MESSAGES,
  GET_GROUP_MESSAGES,
  CREATE_MESSAGE,
  CREATE_GROUP_MESSAGE,
  FIND_USER_BY_USERNAME,
  ADD_GROUP_MEMBERS,
} from '../graphqlCntrls/operations';

const EMPTY_MESSAGES = [];

export default function ChatScreen() {
  const { userId, userName, groupId } = useParams();
  const location = useLocation();
  const isGroup = location.pathname.startsWith('/group');
  const conversationId = isGroup ? groupId : userId;

  const { data: meData, loading: meLoading } = useQuery(GET_ME, {
    fetchPolicy: 'cache-first',
  });
  const currentUserId = meData?.me?.id ?? null;

  const { data: groupData } = useQuery(GET_GROUP, {
    variables: { groupID: groupId },
    skip: !isGroup || !groupId,
  });

  const [input, setInput] = useState('');
  const [sendError, setSendError] = useState(null);
  const [openAddMember, setOpenAddMember] = useState(false);
  const [memberName, setMemberName] = useState('');
  const [memberError, setMemberError] = useState(null);
  const messagesEndRef = useRef();

  const query = isGroup ? GET_GROUP_MESSAGES : GET_PERSONAL_MESSAGES;
  const variables = isGroup
    ? { groupID: conversationId }
    : { receiverID: conversationId };

  const { data, loading, error, refetch } = useQuery(query, {
    variables,
    skip: !conversationId || !currentUserId,
    pollInterval: 3000,
    fetchPolicy: 'cache-and-network',
  });

  const [createMessage, { loading: sendingDirect }] = useMutation(CREATE_MESSAGE);
  const [createGroupMessage, { loading: sendingGroup }] =
    useMutation(CREATE_GROUP_MESSAGE);
  const sending = sendingDirect || sendingGroup;

  const [addGroupMembers, { loading: addingMember }] = useMutation(
    ADD_GROUP_MEMBERS,
    {
      refetchQueries: ['GetGroup', 'GetGroups'],
      onCompleted: () => closeAddMember(),
      onError: (err) =>
        setMemberError(err.message || 'Could not add that member'),
    }
  );

  const [findMember, { loading: findingMember }] = useLazyQuery(
    FIND_USER_BY_USERNAME,
    {
      fetchPolicy: 'network-only',
      onCompleted: ({ findUserByUsername: user }) => {
        if (!user) {
          setMemberError(
            `No user found with the username "${memberName.trim()}"`
          );
          return;
        }
        addGroupMembers({
          variables: { groupID: groupId, memberIds: [user.id] },
        });
      },
      onError: (err) =>
        setMemberError(err.message || 'Could not find that user'),
    }
  );

  function closeAddMember() {
    setOpenAddMember(false);
    setMemberName('');
    setMemberError(null);
  }

  // Derive messages straight from the query so switching conversations can
  // never briefly show the previous chat.
  const messages =
    (isGroup ? data?.getGroupMessages : data?.getPersonalMessages) ?? EMPTY_MESSAGES;

  // Reset the composer when switching conversations.
  useEffect(() => {
    setInput('');
    setSendError(null);
  }, [conversationId, isGroup]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const conversationName = isGroup
    ? groupData?.getGroup?.name || 'Group chat'
    : decodeURIComponent(userName || '');

  const openAddMemberDialog = () => {
    setMemberName('');
    setMemberError(null);
    setOpenAddMember(true);
  };

  const handleAddMember = (e) => {
    e?.preventDefault();
    const name = memberName.trim();
    if (!name || findingMember || addingMember) return;
    setMemberError(null);
    findMember({ variables: { username: name } });
  };

  const send = async (e) => {
    e?.preventDefault();
    if (!input.trim() || !currentUserId || !conversationId || sending) return;

    const text = input.trim();
    setSendError(null);
    try {
      if (isGroup) {
        await createGroupMessage({
          variables: { newMsg: { text, groupID: conversationId } },
        });
      } else {
        await createMessage({
          variables: { newMsg: { text, receiverID: conversationId } },
        });
      }
      setInput('');
      await refetch();
    } catch (err) {
      setSendError(err.message || 'Failed to send message');
    }
  };

  if (meLoading) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!currentUserId || !conversationId) return null;

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        bgcolor: 'background.default',
      }}
    >
      <AppBar position="static" sx={{ mb: 1 }}>
        <Toolbar sx={{ px: 3 }}>
          <Avatar
            sx={{
              width: 34,
              height: 34,
              mr: 2,
              bgcolor: isGroup ? 'secondary.main' : 'primary.main',
              color: isGroup ? 'text.primary' : 'background.default',
            }}
          >
            {isGroup
              ? conversationName.charAt(0).toUpperCase()
              : (userName?.charAt(0) || '?').toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" noWrap>
              {conversationName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {isGroup
                ? groupData?.getGroup
                  ? `${groupData.getGroup.memberCount} members`
                  : 'Group chat'
                : 'Direct message'}
            </Typography>
          </Box>
          {isGroup && (
            <IconButton
              onClick={openAddMemberDialog}
              title="Add member"
              sx={{ ml: 1 }}
            >
              <PersonAddIcon fontSize="small" />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      <Box sx={{ flex: 1, overflowY: 'auto', p: 2, px: 3 }}>
        {error ? (
          <Alert severity="error" sx={{ my: 2 }}>
            {error.message}
          </Alert>
        ) : loading && messages.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : messages.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              mt: 10,
              color: 'text.secondary',
            }}
          >
            <Typography sx={{ mb: 1 }}>No messages yet</Typography>
            <Typography variant="body2">Start the conversation.</Typography>
          </Box>
        ) : (
          <>
            {messages.map((message) => (
              <ChatWindow
                key={message.id}
                message={message}
                currentUserId={currentUserId}
                isGroup={isGroup}
              />
            ))}
            <Box ref={messagesEndRef} />
          </>
        )}
      </Box>

      {sendError && (
        <Alert severity="error" onClose={() => setSendError(null)} sx={{ mx: 3, mb: 1 }}>
          {sendError}
        </Alert>
      )}

      <Stack
        component="form"
        direction="row"
        spacing={1}
        onSubmit={send}
        sx={{
          px: 3,
          pb: 2,
          pt: 1.5,
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <TextField
          size="small"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send(e);
            }
          }}
          fullWidth
          multiline
          maxRows={4}
          sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'background.default' } }}
        />
        <Button
          type="submit"
          size="small"
          variant="contained"
          disabled={!input.trim() || sending}
        >
          Send
        </Button>
      </Stack>

      <Dialog
        open={openAddMember}
        onClose={closeAddMember}
        maxWidth="xs"
        fullWidth
        PaperProps={{ component: 'form', onSubmit: handleAddMember }}
      >
        <DialogTitle>Add member</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Type the exact username of the person you want to add to{' '}
            {conversationName}.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Username"
            fullWidth
            value={memberName}
            onChange={(e) => {
              setMemberName(e.target.value);
              if (memberError) setMemberError(null);
            }}
            disabled={findingMember || addingMember}
            error={Boolean(memberError)}
            helperText={memberError ? ' ' : 'Exact display name, e.g. Jane Doe'}
          />
          {memberError && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {memberError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeAddMember} disabled={findingMember || addingMember}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={!memberName.trim() || findingMember || addingMember}
            startIcon={
              findingMember || addingMember ? (
                <CircularProgress size={16} color="inherit" />
              ) : null
            }
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
