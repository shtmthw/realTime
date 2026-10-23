import { useParams, useLocation } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
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
} from '@mui/material';
import ChatWindow from '../components/chatWindow';
import {
  GET_PERSONAL_MESSAGES,
  GET_GROUP_MESSAGES,
  CREATE_MESSAGE,
  CREATE_GROUP_MESSAGE,
} from '../graphqlCntrls/operations';

const getCurrentUserId = () => {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return (decoded.userID ?? decoded.id)?.toString() ?? null;
  } catch {
    return null;
  }
};

export default function ChatScreen() {
  const { userId, userName } = useParams();
  const { groupId } = useParams();
  const location = useLocation();
  const currentUserId = getCurrentUserId();
  const isGroup = location.pathname.startsWith('/group');
  const conversationId = isGroup ? groupId : userId;
  const conversationName = isGroup
    ? 'Group chat'
    : decodeURIComponent(userName || '');

  const [input, setInput] = useState('');
  const messagesEndRef = useRef();

  const { data, loading } = useQuery(
    isGroup ? GET_GROUP_MESSAGES : GET_PERSONAL_MESSAGES,
    {
      variables: isGroup
        ? { groupID: conversationId }
        : { receiverID: conversationId },
      skip: !conversationId || !currentUserId,
      pollInterval: 3000,
    }
  );

  const [createMessage] = useMutation(CREATE_MESSAGE);
  const [createGroupMessage] = useMutation(CREATE_GROUP_MESSAGE);

  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (data) {
      setMessages(
        isGroup ? data.getGroupMessages : data.getPersonalMessages
      );
    }
  }, [data, isGroup]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    if (!input.trim() || !currentUserId || !conversationId) return;
    try {
      if (isGroup) {
        await createGroupMessage({
          variables: {
            newMsg: { text: input.trim(), groupID: conversationId },
          },
        });
      } else {
        await createMessage({
          variables: {
            newMsg: { text: input.trim(), receiverID: conversationId },
          },
        });
      }
      setInput('');
    } catch (err) {
      alert(err.message || 'Failed to send message');
    }
  };

  if (!currentUserId || !conversationId) return null;

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" sx={{ mb: 1 }}>
        <Toolbar sx={{ px: 3 }}>
          <Avatar sx={{ width: 34, height: 34, mr: 2, bgcolor: isGroup ? 'secondary.main' : 'primary.main' }}>
            {isGroup ? '👥' : (userName?.charAt(0) || '?').toUpperCase()}
          </Avatar>
          <Typography variant="h6" sx={{ flex: 1 }}>
            {conversationName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {isGroup ? 'Group chat' : 'Direct message'}
          </Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ flex: 1, overflowY: 'auto', p: 2, px: 3 }}>
        {loading ? (
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

      <Stack direction="row" spacing={1} sx={{ px: 3, pb: 2, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <TextField
          size="small"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send(e)}
          fullWidth
          sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#0f172a' } }}
        />
        <Button
          size="small"
          variant="contained"
          disabled={!input.trim()}
          onClick={send}
        >
          Send
        </Button>
      </Stack>
    </Box>
  );
}
