import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline } from '@mui/material';
import { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client';
import PropTypes from 'prop-types';
import Auth from './pages/auth';
import Home from './pages/home';
import darkTheme from './theme';
import { GET_ME } from './graphqlCntrls/operations';

const AUTH_ERROR = /log ?in|unauthori[sz]ed|not authenticated|invalid token|jwt|expired/i;

function Splash({ label }) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        bgcolor: 'background.default',
      }}
    >
      <CircularProgress />
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}

Splash.propTypes = {
  label: PropTypes.string.isRequired,
};

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token'));

  const { data, loading, error, refetch } = useQuery(GET_ME, {
    skip: !token,
    fetchPolicy: 'network-only',
  });

  useEffect(() => {
    const syncToken = () => setToken(localStorage.getItem('token'));
    window.addEventListener('storage', syncToken);
    window.addEventListener('tokenchange', syncToken);
    return () => {
      window.removeEventListener('storage', syncToken);
      window.removeEventListener('tokenchange', syncToken);
    };
  }, []);

  const authError =
    error?.graphQLErrors?.some((e) => AUTH_ERROR.test(e.message)) ?? false;

  // A token that no longer resolves to a user is as good as no token.
  useEffect(() => {
    if (token && (authError || (!loading && !error && !data?.me))) {
      localStorage.removeItem('token');
      setToken(null);
    }
  }, [token, authError, loading, error, data]);

  const checkingSession = Boolean(
    token && !authError && (loading || (!data && !error))
  );

  const renderContent = () => {
    if (checkingSession) return <Splash label="Checking your session..." />;

    if (token && error && !authError) {
      return (
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.default',
            px: 2,
          }}
        >
          <Stack spacing={2} alignItems="center" textAlign="center">
            <Typography variant="h6">Can&apos;t reach the server</Typography>
            <Typography variant="body2" color="text.secondary">
              The API is not responding. Check that the containers are running.
            </Typography>
            <Button variant="contained" onClick={() => refetch()}>
              Try again
            </Button>
          </Stack>
        </Box>
      );
    }

    if (token && data?.me) {
      return (
        <Routes>
          <Route path="*" element={<Home />} />
        </Routes>
      );
    }

    return (
      <Routes>
        <Route path="/" element={<Auth />} />
        <Route path="/login" element={<Auth />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box component="main">{renderContent()}</Box>
    </ThemeProvider>
  );
}

export default App;
