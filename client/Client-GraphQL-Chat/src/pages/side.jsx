import { useMemo, useState } from 'react';
import {
  Box,
  Stack,
  TextField,
  Typography,
  Button,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Checkbox,
  CircularProgress,
  IconButton,
  Alert,
} from '@mui/material';
import { useQuery, useMutation, useLazyQuery } from '@apollo/client';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  GET_CONVERSATIONS,
  GET_GROUPS,
  CREATE_GROUP,
  ADD_CONVERSATION,
  FIND_USER_BY_USERNAME,
} from '../graphqlCntrls/operations';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import GroupIcon from '@mui/icons-material/Group';
import LogoutIcon from '@mui/icons-material/Logout';

const initialGroupState = {
  name: '',
  members: [],
};

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [openAddUserDialog, setOpenAddUserDialog] = useState(false);
  const [username, setUsername] = useState('');
  const [addError, setAddError] = useState(null);

  const [openGroupDialog, setOpenGroupDialog] = useState(false);
  const [groupName, setGroupName] = useState(initialGroupState.name);
  const [selectedMembers, setSelectedMembers] = useState(
    initialGroupState.members
  );
  const [groupError, setGroupError] = useState(null);
  const [extraMembers, setExtraMembers] = useState([]);
  const [newMemberName, setNewMemberName] = useState('');
  const [findingMember, setFindingMember] = useState(false);

  const {
    data: conversationsData,
    loading: conversationsLoading,
    error: conversationsError,
    refetch: refetchConversations,
  } = useQuery(GET_CONVERSATIONS, { fetchPolicy: 'cache-and-network' });

  const {
    data: groupsData,
    loading: groupsLoading,
    error: groupsError,
    refetch: refetchGroups,
  } = useQuery(GET_GROUPS, { fetchPolicy: 'cache-and-network' });

  const conversations = useMemo(
    () => conversationsData?.getConversations || [],
    [conversationsData]
  );
  const groups = useMemo(
    () => groupsData?.getGroups || [],
    [groupsData]
  );

  // Conversations plus anyone looked up by username inside the group dialog.
  const groupCandidates = useMemo(() => {
    const byId = new Map();
    for (const user of [...conversations, ...extraMembers]) {
      byId.set(user.id, user);
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [conversations, extraMembers]);

  const [addConversation, { loading: addingUser }] = useMutation(
    ADD_CONVERSATION,
    {
      onCompleted: ({ addConversation: user }) => {
        setOpenAddUserDialog(false);
        setUsername('');
        setAddError(null);
        refetchConversations();
        navigate(`/dm/${user.id}/${encodeURIComponent(user.name)}`);
      },
      onError: (err) => {
        setAddError(err.message || 'Could not add that user');
      },
    }
  );

  const [createGroup, { loading: creatingGroup }] = useMutation(CREATE_GROUP, {
    onCompleted: ({ createGroup: group }) => {
      closeGroupDialog();
      refetchGroups();
      navigate(`/group/${group.id}`);
    },
    onError: (err) => {
      setGroupError(err.message || 'Failed to create group');
    },
  });

  const [findUserByUsername] = useLazyQuery(FIND_USER_BY_USERNAME, {
    fetchPolicy: 'network-only',
    onCompleted: ({ findUserByUsername: user }) => {
      setFindingMember(false);
      if (!user) {
        setGroupError(
          `No user found with the username "${newMemberName.trim()}"`
        );
        return;
      }
      setExtraMembers((prev) =>
        prev.some((member) => member.id === user.id) ? prev : [...prev, user]
      );
      setSelectedMembers((prev) =>
        prev.includes(user.id) ? prev : [...prev, user.id]
      );
      setNewMemberName('');
      setGroupError(null);
    },
    onError: (err) => {
      setFindingMember(false);
      setGroupError(err.message || 'Could not find that user');
    },
  });

  const isConversationActive = (id) =>
    location.pathname.startsWith(`/dm/${id}/`);

  const isGroupActive = (id) => location.pathname === `/group/${id}`;

  const openAddUser = () => {
    setUsername('');
    setAddError(null);
    setOpenAddUserDialog(true);
  };

  const closeAddUser = () => {
    setOpenAddUserDialog(false);
    setUsername('');
    setAddError(null);
  };

  const handleAddUser = (e) => {
    e?.preventDefault();
    const name = username.trim();
    if (!name || addingUser) return;
    setAddError(null);
    addConversation({ variables: { username: name } });
  };

  const openGroup = () => {
    setGroupName('');
    setSelectedMembers([]);
    setExtraMembers([]);
    setNewMemberName('');
    setFindingMember(false);
    setGroupError(null);
    setOpenGroupDialog(true);
    refetchConversations();
  };

  function closeGroupDialog() {
    setOpenGroupDialog(false);
    setGroupName(initialGroupState.name);
    setSelectedMembers(initialGroupState.members);
    setExtraMembers([]);
    setNewMemberName('');
    setFindingMember(false);
    setGroupError(null);
  }

  const handleAddGroupMember = (e) => {
    e?.preventDefault();
    const name = newMemberName.trim();
    if (!name || findingMember) return;
    setGroupError(null);
    setFindingMember(true);
    findUserByUsername({ variables: { username: name } });
  };

  const toggleMember = (id) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((memberId) => memberId !== id) : [...prev, id]
    );
  };

  const handleCreateGroup = async (e) => {
    e?.preventDefault();
    const name = groupName.trim();
    if (!name || selectedMembers.length === 0 || creatingGroup) return;
    setGroupError(null);
    await createGroup({
      variables: {
        newGroup: { name, memberIds: selectedMembers },
      },
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.dispatchEvent(new Event('tokenchange'));
    navigate('/');
  };

  return (
    <>
      <Box
        sx={{
          width: 280,
          height: '100vh',
          bgcolor: 'background.paper',
          borderRight: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h6" sx={{ flex: 1 }}>
              Realtime
            </Typography>
            <IconButton onClick={openAddUser} size="small" title="Add user">
              <PersonAddIcon fontSize="small" />
            </IconButton>
            <IconButton onClick={handleLogout} size="small" title="Logout">
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Box>

        <Box sx={{ flex: 1, overflowY: 'auto', p: 1 }}>
          <Box sx={{ px: 2, pb: 1 }}>
            <Typography variant="overline" color="text.secondary">
              Direct Messages
            </Typography>
          </Box>
          <List sx={{ px: 1 }}>
            {conversationsLoading && conversations.length === 0 ? (
              <ListItem sx={{ px: 2 }}>
                <CircularProgress size={20} />
              </ListItem>
            ) : conversationsError ? (
              <ListItem sx={{ px: 2, color: 'error.main' }}>
                Could not load chats
              </ListItem>
            ) : conversations.length === 0 ? (
              <ListItem sx={{ px: 2, color: 'text.secondary', display: 'block' }}>
                No chats yet. Use the add-user button and type a username.
              </ListItem>
            ) : (
              conversations.map((user) => (
                <ListItem key={user.id} disablePadding>
                  <ListItemButton
                    selected={isConversationActive(user.id)}
                    onClick={() =>
                      navigate(`/dm/${user.id}/${encodeURIComponent(user.name)}`)
                    }
                    sx={{ py: 1, borderRadius: 1, mb: 0.5 }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', color: 'background.default' }}>
                        {user.name.charAt(0).toUpperCase()}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={user.name}
                      primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                    />
                  </ListItemButton>
                </ListItem>
              ))
            )}
          </List>

          <Divider sx={{ my: 1 }} />

          <Box sx={{ px: 2, pb: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="overline" color="text.secondary" sx={{ flex: 1 }}>
                Groups
              </Typography>
              <Button
                size="small"
                onClick={openGroup}
                sx={{ px: 1, py: 0, minWidth: 'auto' }}
                startIcon={<GroupIcon fontSize="small" />}
              >
                New group
              </Button>
            </Stack>
          </Box>
          <List sx={{ px: 1 }}>
            {groupsLoading && groups.length === 0 ? (
              <ListItem sx={{ px: 2 }}>
                <CircularProgress size={20} />
              </ListItem>
            ) : groupsError ? (
              <ListItem sx={{ px: 2, color: 'error.main' }}>
                Could not load groups
              </ListItem>
            ) : groups.length === 0 ? (
              <ListItem sx={{ px: 2, color: 'text.secondary' }}>
                No groups yet
              </ListItem>
            ) : (
              groups.map((group) => (
                <ListItem key={group.id} disablePadding>
                  <ListItemButton
                    selected={isGroupActive(group.id)}
                    onClick={() => navigate(`/group/${group.id}`)}
                    sx={{ py: 1, borderRadius: 1, mb: 0.5 }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main', color: 'text.primary' }}>
                        {group.name.charAt(0).toUpperCase()}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={group.name}
                      primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                      secondary={`Members: ${group.memberCount}`}
                      secondaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                    />
                  </ListItemButton>
                </ListItem>
              ))
            )}
          </List>
        </Box>
      </Box>

      <Dialog
        open={openAddUserDialog}
        onClose={closeAddUser}
        maxWidth="xs"
        fullWidth
        PaperProps={{ component: 'form', onSubmit: handleAddUser }}
      >
        <DialogTitle>Add user</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Type the exact username of someone you know. If the account exists,
            the chat is added to your Direct Messages.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Username"
            fullWidth
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              if (addError) setAddError(null);
            }}
            placeholder="e.g. Jane Doe"
            disabled={addingUser}
            error={Boolean(addError)}
            helperText={addError ? ' ' : 'Exact display name, e.g. Jane Doe'}
          />
          {addError && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {addError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeAddUser} disabled={addingUser}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={!username.trim() || addingUser}
            startIcon={
              addingUser ? <CircularProgress size={16} color="inherit" /> : null
            }
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openGroupDialog}
        onClose={closeGroupDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{ component: 'form', onSubmit: handleCreateGroup }}
      >
        <DialogTitle>New group</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Give the group a name, then select one or more people.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            name="name"
            label="Group name"
            fullWidth
            value={groupName}
            onChange={(e) => {
              setGroupName(e.target.value);
              if (groupError) setGroupError(null);
            }}
            disabled={creatingGroup}
          />

          <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ mt: 2 }}>
            <TextField
              size="small"
              label="Add by username"
              placeholder="Exact display name"
              fullWidth
              value={newMemberName}
              onChange={(e) => {
                setNewMemberName(e.target.value);
                if (groupError) setGroupError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddGroupMember(e);
                }
              }}
              disabled={creatingGroup || findingMember}
              helperText="Can't see someone? Add them by their exact username."
            />
            <Button
              type="button"
              variant="outlined"
              onClick={handleAddGroupMember}
              disabled={!newMemberName.trim() || findingMember || creatingGroup}
              sx={{ mt: 0.5, minWidth: 72 }}
            >
              {findingMember ? <CircularProgress size={18} /> : 'Add'}
            </Button>
          </Stack>

          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mt: 2, mb: 1 }}
          >
            <Typography variant="subtitle2">Members</Typography>
            <Typography variant="caption" color="text.secondary">
              {selectedMembers.length} selected
            </Typography>
          </Stack>

          <Box sx={{ maxHeight: 260, overflowY: 'auto' }}>
            {groupCandidates.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                No one to show yet. Add someone by username above, or start a
                chat first.
              </Typography>
            ) : (
              groupCandidates.map((user) => {
                const selected = selectedMembers.includes(user.id);
                return (
                  <ListItem key={user.id} disablePadding>
                    <ListItemButton
                      onClick={() => toggleMember(user.id)}
                      disabled={creatingGroup}
                      sx={{ borderRadius: 1 }}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ width: 28, height: 28, bgcolor: 'primary.main', color: 'background.default' }}>
                          {user.name.charAt(0).toUpperCase()}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText primary={user.name} />
                      <Checkbox
                        edge="end"
                        checked={selected}
                        tabIndex={-1}
                        disableRipple
                        sx={{ pointerEvents: 'none' }}
                        inputProps={{ 'aria-label': `Add ${user.name} to the group` }}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })
            )}
          </Box>

          {groupError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {groupError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeGroupDialog} disabled={creatingGroup}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={!groupName.trim() || selectedMembers.length === 0 || creatingGroup}
            startIcon={
              creatingGroup ? <CircularProgress size={16} color="inherit" /> : null
            }
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
