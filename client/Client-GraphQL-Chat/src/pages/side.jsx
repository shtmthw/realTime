import { useState } from 'react';
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
import { useQuery, useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { GET_USERS, GET_GROUPS, CREATE_GROUP, SEND_FRIEND_REQUEST, GET_FRIEND_REQUESTS } from '../graphqlCntrls/operations';
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

export default function Sidebar() {
  const navigate = useNavigate();
  const [openGroupDialog, setOpenGroupDialog] = useState(false);
  const [openAddUserDialog, setOpenAddUserDialog] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [addUserError, setAddUserError] = useState(null);
  const [addUserLoading, setAddUserLoading] = useState(false);

  const { data: usersData, loading: usersLoading, refetch: refetchUsers } = useQuery(GET_USERS);
  const { data: groupsData, loading: groupsLoading, refetch: refetchGroups } = useQuery(GET_GROUPS);
  const { data: friendRequestsData, refetch: refetchFriendRequests } = useQuery(GET_FRIEND_REQUESTS);
  const [createGroup] = useMutation(CREATE_GROUP, {
    onCompleted: ({ createGroup: group }) => {
      setOpenGroupDialog(false);
      setNewGroupName('');
      setSelectedMembers([]);
      refetchGroups();
      refetchUsers();
      navigate(`/group/${group.id}`);
    },
    onError: (err) => {
      alert(err.message || 'Failed to create group');
    },
  });

  const [sendFriendRequest] = useMutation(SEND_FRIEND_REQUEST, {
    onCompleted: () => {
      setOpenAddUserDialog(false);
      setAddUserError(null);
      setAddUserLoading(false);
      refetchUsers();
      refetchFriendRequests();
    },
    onError: (err) => {
      setAddUserError(err.message || 'Failed to send friend request');
      setAddUserLoading(false);
    },
  });

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    await createGroup({
      variables: {
        newGroup: {
          name: newGroupName.trim(),
          memberIds: selectedMembers,
        },
      },
    });
  };

  const users = usersData?.users || [];
  const groups = groupsData?.getGroups || [];

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const handleSendFriendRequest = async (receiverId) => {
    setAddUserLoading(true);
    setAddUserError(null);
    try {
      await sendFriendRequest({
        variables: {
          input: {
            receiverId: receiverId,
          },
        },
      });
    } catch (err) {
      setAddUserError(err.message || 'Failed to send friend request');
      setAddUserLoading(false);
    }
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
          <Avatar sx={{ bgcolor: 'primary.main' }} size={32}>
            <PersonIcon fontSize="small" />
          </Avatar>
          <Typography variant="h6" sx={{ flex: 1 }}>
            Realtime
          </Typography>
          <IconButton onClick={() => { setOpenAddUserDialog(true); refetchUsers(); }} size="small" title="Add user">
            <PersonAddIcon fontSize="small" />
          </IconButton>
          <IconButton onClick={handleLogout} size="small" title="Logout">
            <LogoutIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', p: 1 }}>
        {/* Direct Messages */}
        <Box sx={{ px: 2, pb: 1 }}>
          <Typography variant="overline" color="text.secondary">
            Direct Messages
          </Typography>
        </Box>
        <List sx={{ px: 1 }}>
          {usersLoading ? (
            <ListItem sx={{ px: 2 }}><CircularProgress size={20} /></ListItem>
          ) : users.length === 0 ? (
            <ListItem sx={{ px: 2, color: 'text.secondary' }}>
              No users found
            </ListItem>
          ) : (
            users.map((user) => (
              <ListItem key={user.id} disablePadding>
              <ListItemButton
                onClick={() => navigate(`/dm/${user.id}/${encodeURIComponent(user.name)}`)}
                sx={{ py: 1, '&:hover': { bgcolor: 'rgba(156, 163, 175, 0.12)' } }}
              >
                  <ListItemAvatar>
                    <Avatar sx={{ width: 32, height: 32 }}>
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

        {/* Groups */}
        <Box sx={{ px: 2, pb: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="overline" color="text.secondary">
              Groups
            </Typography>
            <Button
              size="small"
              onClick={() => setOpenGroupDialog(true)}
              sx={{ px: 1, py: 0, minWidth: 'auto' }}
              startIcon={<GroupIcon fontSize="small" />}
            >
              New group
            </Button>
          </Stack>
        </Box>
        <List sx={{ px: 1 }}>
          {groupsLoading ? (
            <ListItem sx={{ px: 2 }}><CircularProgress size={20} /></ListItem>
          ) : groups.length === 0 ? (
            <ListItem sx={{ px: 2, color: 'text.secondary' }}>
              No groups yet
            </ListItem>
          ) : (
            groups.map((group) => (
              <ListItem key={group.id} disablePadding>
                <ListItemButton
                  onClick={() => navigate(`/group/${group.id}`)}
                  sx={{ py: 1, '&:hover': { bgcolor: 'rgba(156, 163, 175, 0.12)' } }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
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
        onClose={() => {
          setOpenAddUserDialog(false);
          setAddUserError(null);
        }}
        maxWidth="xs"
        fullWidth
        sx={{ '& .MuiDialog-paper': { bgcolor: 'background.paper' } }}
      >
        <DialogTitle sx={{ color: 'text.primary' }}>Add user</DialogTitle>
        <DialogContent sx={{ color: 'text.primary', py: 1 }}>
          <DialogContentText sx={{ mb: 2 }}>
            Select a user to send a friend request.
          </DialogContentText>
          {addUserError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {addUserError}
            </Alert>
          )}
          <List sx={{ px: 1, maxHeight: 300, overflowY: 'auto' }}>
            {usersLoading ? (
              <ListItem sx={{ px: 2 }}><CircularProgress size={20} /></ListItem>
            ) : users.length === 0 ? (
              <ListItem sx={{ px: 2, color: 'text.secondary' }}>
                No users found
              </ListItem>
            ) : (
              users.map((user) => (
                <ListItem
                  key={user.id}
                  disablePadding
                  sx={{ py: 1, '&:hover': { bgcolor: 'rgba(156, 163, 175, 0.12)' } }}
                  onClick={() => handleSendFriendRequest(user.id)}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ width: 32, height: 32 }}>
                      {user.name.charAt(0).toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={user.name}
                    primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                  />
                </ListItem>
              ))
            )}
          </List>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => {
            setOpenAddUserDialog(false);
            setAddUserError(null);
          }}>Cancel</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openGroupDialog}
        onClose={() => setOpenGroupDialog(false)}
        maxWidth="sm"
        sx={{ '& .MuiDialog-paper': { bgcolor: 'background.paper' } }}
      >
      <DialogTitle sx={{ color: 'text.primary' }}>New group</DialogTitle>
      <DialogContent sx={{ color: 'text.primary', py: 1 }}>
        <DialogContentText sx={{ mb: 2 }}>
          Give the group a name and optionally pick members.
        </DialogContentText>
        <TextField
          autoFocus
          margin="dense"
          name="name"
          label="Group name"
          fullWidth
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
        />
        <Box sx={{ mt: 2, maxHeight: 240, overflowY: 'auto' }}>
          {users.map((user) => (
            <ListItem
              key={user.id}
              sx={{ px: 1, cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' } }}
              onClick={() => {
                setSelectedMembers((prev) =>
                  prev.includes(user.id)
                    ? prev.filter((id) => id !== user.id)
                    : [...prev, user.id]
                );
              }}
            >
              <ListItemAvatar>
                <Avatar sx={{ width: 28, height: 28 }}>
                  {user.name.charAt(0).toUpperCase()}
                </Avatar>
              </ListItemAvatar>
              <ListItemText primary={user.name} />
              <Checkbox
                checked={selectedMembers.includes(user.id)}
                onClick={() => {
                  setSelectedMembers((prev) =>
                    prev.includes(user.id)
                      ? prev.filter((id) => id !== user.id)
                      : [...prev, user.id]
                  );
                }}
                sx={{ ml: 'auto', pl: 1 }}
                color="primary"
              />
            </ListItem>
          ))}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={() => setOpenGroupDialog(false)}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!newGroupName.trim()}
          onClick={handleCreateGroup}
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
}
