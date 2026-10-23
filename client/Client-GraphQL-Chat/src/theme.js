import { createTheme } from '@mui/material/styles';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#101418',
      paper: '#1b2027',
    },
    primary: {
      main: '#9ca3af',
      contrastText: '#101418',
    },
    secondary: {
      main: '#6b7280',
    },
    text: {
      primary: '#e5e7eb',
      secondary: '#9ca3af',
    },
    divider: '#2a3038',
  },
  typography: {
    fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
    h1: { fontWeight: 700 },
    h6: { fontWeight: 600 },
  },
  shape: {
    borderRadius: 10,
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#1b2027',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#1b2027',
          color: '#e5e7eb',
          borderBottom: '1px solid #2a3038',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
        },
        contained: {
          backgroundColor: '#9ca3af',
          color: '#101418',
          '&:hover': { backgroundColor: '#d1d5db' },
        },
        outlined: {
          borderColor: '#3a3f45',
          color: '#e5e7eb',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': { borderColor: '#3a3f45' },
            '&:hover fieldset': { borderColor: '#9ca3af' },
            '&.Mui-focused fieldset': { borderColor: '#9ca3af' },
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: '#1b2027',
          backgroundImage: 'none',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          '&:hover': { backgroundColor: 'rgba(156, 163, 175, 0.12)' },
        },
      },
    },
  },
});

export default darkTheme;
