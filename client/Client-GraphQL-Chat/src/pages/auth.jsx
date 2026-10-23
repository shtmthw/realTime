import { useState } from 'react';
import {
  Box,
  Stack,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Card,
  CardContent,
} from '@mui/material';
import { useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { SIGNUP, LOGIN } from '../graphqlCntrls/operations';

export default function Auth() {
  const [mode, setMode] = useState<'signup' | 'login'>('login');
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const [signup] = useMutation(SIGNUP);
  const [login] = useMutation(LOGIN, {
    onCompleted: ({ loginUser }) => {
      localStorage.setItem('token', loginUser.token);
      setError(null);
      navigate('/');
    },
    onError: (err) => setError(err.message || 'Login failed'),
  });

  const onChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === 'login') {
        await login({ variables: { userInfo: { email: formData.email, password: formData.password } } });
      } else {
        await signup({
          variables: {
            newUser: {
              name: formData.name,
              email: formData.email,
              password: formData.password,
            },
          },
        });
        setError(null);
      }
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'background.default',
        px: 2,
      }}
    >
      <Card sx={{ width: 420, p: 3, bgcolor: 'background.paper', borderRadius: 3 }}>
        <CardContent>
          <Stack sx={{ mb: 3, alignItems: 'center' }}>
            <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
              Realtime
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Simple. Private. Group messaging.
            </Typography>
          </Stack>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            {mode === 'signup' && (
              <TextField
                required
                name="name"
                label="Full name"
                autoComplete="name"
                value={formData.name}
                onChange={onChange}
                fullWidth
              />
            )}
            <TextField
              required
              name="email"
              type="email"
              label="Email"
              autoComplete="email"
              value={formData.email}
              onChange={onChange}
              fullWidth
            />
            <TextField
              required
              name="password"
              type="password"
              label="Password"
              autoComplete="new-password"
              value={formData.password}
              onChange={onChange}
              fullWidth
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading}
              sx={{ mt: 1 }}
            >
              {loading ? <CircularProgress size={20} /> : mode === 'login' ? 'Sign in' : 'Create account'}
            </Button>
          </form>

          <Typography
            variant="body2"
            align="center"
            sx={{ mt: 2, cursor: 'pointer', color: 'primary.main' }}
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          >
            {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
