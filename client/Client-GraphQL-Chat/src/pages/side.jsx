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
} from '@mui/material';
import { useQuery, useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { GET_USERS, GET_GROUPS, CREATE_GROUP } from '../graphqlCntrls/operations';
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';
import LogoutIcon from '@mui/icons-material/Logout';

export default function Sidebar() {
  const navigate = useNavigate();
  const [openGroupDialog, setOpenGroupDialog] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);

  const { data: usersData, loading: usersLoading } = useQuery(GET_USERS);
  const { data: groupsData, loading: groupsLoading } = useQuery(GET_GROUPS);
  const [createGroup] = useMutation(CREATE_GROUP, {
    onCompleted: ({ createGroup }) => {
      setOpenGroupDialog(false);
      setNewGroupName('');
      setSelectedMembers([]);
      navigate(`/group/${createGroup.id}`);
    },
  });

  const users = usersData?.users || [];
  const groups = groupsData?.getGroups || [];

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

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
                  sx={{ py: 1, '&:hover': { bgcolor: 'rgba(56, 189, 248, 0.08)' } }}
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
                  sx={{ py: 1, '&:hover': { bgcolor: 'rgba(56, 189, 248, 0.08)' } }}
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
      open={openGroupDialog}
      onClose={() => setOpenGroupDialog(false)}
      maxWidth="sm"
      sx={{ '& .MuiDialog-paper': { bgcolor: 'background.paper' } }}
    >
      <DialogTitle sx={{ color: 'text.primary' }}>New group</DialogTitle>
      <DialogContent sx={{ color: 'text.primary', py: 1 }}>
        <DialogContentText sx={{ mb: 2 }}>
          Pick members and give the group a name.
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
          disabled={!newGroupName.trim() || selectedMembers.length === 0}
          onClick={handleCreateGroup}
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
}
