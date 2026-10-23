import { Box, Typography } from '@mui/material';
import PropTypes from 'prop-types';

export default function ChatWindow({ message, currentUserId, isGroup }) {
  const isSent = message.senderID === currentUserId;
  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isSent ? 'flex-end' : 'flex-start',
        my: 0.8,
        mx: 1,
      }}
    >
      <Box
        sx={{
          maxWidth: '75%',
          px: 2,
          py: 1,
          borderRadius: 2,
          bgcolor: isSent ? 'primary.main' : 'rgba(255, 255, 255, 0.08)',
          color: isSent ? '#0f172a' : '#f1f5f9',
          ml: isSent ? 'auto' : 0,
        }}
      >
        {isGroup && !isSent && (
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', mb: 0.5, textAlign: 'left' }}
          >
            {message.senderName || 'Unknown'}
          </Typography>
        )}
        <Typography variant="body2" sx={{ mb: 0.5 }}>
          {message.text}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            textAlign: isSent ? 'right' : 'left',
          }}
        >
          {time}
        </Typography>
      </Box>
    </Box>
  );
}

ChatWindow.propTypes = {
  message: PropTypes.shape({
    id: PropTypes.string.isRequired,
    text: PropTypes.string.isRequired,
    senderID: PropTypes.string.isRequired,
    senderName: PropTypes.string,
    receiverID: PropTypes.string,
    groupID: PropTypes.string,
    createdAt: PropTypes.string.isRequired,
  }).isRequired,
  currentUserId: PropTypes.string.isRequired,
  isGroup: PropTypes.bool,
};
