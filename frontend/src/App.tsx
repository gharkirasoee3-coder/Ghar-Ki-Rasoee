import AppRoutes from './routes/AppRoutes';
import { Toaster } from 'sonner';

// import { CartProvider } from './context/CartContext';

import { AuthProvider } from './context/AuthContext';
import { CityProvider } from './context/CityContext';

function App() {
  return (
    <div className="min-h-screen flex flex-col font-sans text-text-primary bg-gray-50">
      <AuthProvider>
        <CityProvider>
          {/* CartProvider Removed */}
          <AppRoutes />
          <Toaster position="top-center" richColors />
        </CityProvider>
      </AuthProvider>
    </div>
  );
}

export default App;
