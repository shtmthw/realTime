import { Box } from '@mui/system';
import { ThemeProvider } from '@mui/material/styles';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline } from '@mui/material';
import Auth from './pages/auth';
import Home from './pages/home';
import darkTheme from './theme';

function App() {
  const token = localStorage.getItem('token');
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box component="main">
        <Routes>
          {token ? (
            <>
              <Route path="/" element={<Home />} />
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
