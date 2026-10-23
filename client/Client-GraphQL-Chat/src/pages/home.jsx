import { Box } from '@mui/material';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './side';
import WelcomeScreen from './welcomeScreen';
import ChatScreen from './chatscreen';

export default function Home() {
  return (
    <Box display="flex" sx={{ height: '100vh' }}>
      <Sidebar />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Routes>
          <Route path="/" element={<WelcomeScreen />} />
          <Route path="/dm/:userId/:userName" element={<ChatScreen />} />
          <Route path="/group/:groupId" element={<ChatScreen />} />
        </Routes>
      </Box>
    </Box>
  );
}
