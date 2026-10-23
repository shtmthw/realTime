import { Box, Stack, Typography, Avatar } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';

export default function WelcomeScreen() {
  return (
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          px: 4,
          py: 4,
        }}
      >
        <Avatar sx={{ width: 112, height: 112, mb: 10, bgcolor: 'primary.main' }}>
          <PersonIcon fontSize="large" />
        </Avatar>
      <Stack spacing={1} alignItems="center" textAlign="center">
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Welcome to Realtime
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 320 }}>
          Select a direct message from the sidebar or create a group to start
          messaging. Messages sync in real time across devices.
        </Typography>
      </Stack>
    </Box>
  );
}
