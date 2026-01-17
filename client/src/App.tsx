import { RouterProvider } from 'react-router-dom';
import { router } from '@/app/router';
import { Providers } from '@/app/providers';
import { MobileBlocker } from './components/common/mobile-blocker/MobileBlocker';

function App() {
  return (
    <Providers>
      <MobileBlocker />
      <RouterProvider router={router} />
    </Providers>
  );
}

export default App;
