import { RouterProvider } from 'react-router-dom';
import { router } from '@/app/router';
import { Providers } from '@/app/providers';
import { MobileBlocker } from '@/components/common/MobileBlocker/MobileBlocker';
import { useBootstrapAuth } from '@/hooks/useBootstrapAuth';

function AppInner() {
  useBootstrapAuth();
  return (
    <>
      <MobileBlocker />
      <RouterProvider router={router} />
    </>
  );
}

function App() {
  return (
    <Providers>
      <AppInner />
    </Providers>
  );
}

export default App;
