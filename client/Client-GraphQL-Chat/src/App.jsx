import { Box } from '@mui/system';
import { ThemeProvider } from '@mui/material/styles';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline } from '@mui/material';
import { useEffect, useState } from 'react';
import Auth from './pages/auth';
import Home from './pages/home';
import darkTheme from './theme';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    const syncToken = () => setToken(localStorage.getItem('token'));
    window.addEventListener('storage', syncToken);
    window.addEventListener('tokenchange', syncToken);
    return () => {
      window.removeEventListener('storage', syncToken);
      window.removeEventListener('tokenchange', syncToken);
    };
  }, []);

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box component="main">
        <Routes>
          {token ? (
            <>
              <Route path="*" element={<Home />} />
              <Route path="/*" element={<Navigate to="/" replace />} />
            </>
          ) : (
            <>
              <Route path="/" element={<Auth />} />
              <Route path="/login" element={<Auth />} />
              <Route path="/*" element={<Navigate to="/" replace />} />
            </>
          )}
        </Routes>
      </Box>
    </ThemeProvider>
  );
}

export default App;
