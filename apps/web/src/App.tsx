import { useQuery } from '@apollo/client';
import { Toaster } from 'sonner';
import { Button } from '@/components/Button';
import { Logo } from '@/components/Logo';
import { ME } from '@/lib/gql';
import { useThemePreference } from '@/lib/theme';
import { AppShell } from './features/AppShell';
import { AuthPage } from './features/auth/AuthPage';
import { EventsProvider } from './features/realtime/EventsProvider';
import { ViewerProvider } from './features/session/ViewerProvider';

function Splash() {
  return (
    <div className="flex h-dvh items-center justify-center">
      <div className="animate-pulse">
        <Logo size={48} />
      </div>
    </div>
  );
}

export default function App() {
  const { data, loading, error, refetch } = useQuery(ME);
  const [theme] = useThemePreference();

  let screen;
  if (loading && !data) {
    screen = <Splash />;
  } else if (error && !data) {
    screen = (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 px-8 text-center">
        <Logo size={48} />
        <h1 className="mt-2 text-lg font-semibold">Can’t reach the server</h1>
        <p className="max-w-xs text-sm text-muted-foreground">
          Check your connection and that the app is running, then try again.
        </p>
        <Button onClick={() => void refetch()}>Try again</Button>
      </div>
    );
  } else if (!data?.me) {
    screen = <AuthPage />;
  } else {
    screen = (
      <ViewerProvider viewer={data.me}>
        <EventsProvider>
          <AppShell />
        </EventsProvider>
      </ViewerProvider>
    );
  }

  return (
    <>
      {screen}
      <Toaster
        position="top-center"
        theme={theme}
        closeButton={false}
        toastOptions={{ className: '!rounded-xl' }}
      />
    </>
  );
}
