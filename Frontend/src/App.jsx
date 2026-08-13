import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { APP_CONFIG } from './config/appConfig';
import { ToastContainer } from './components/ui/Toast';
import ProtectedRoute from './components/layout/ProtectedRoute';
import Landing from './modules/Landing/Landing';
import Login from './modules/Auth/Login';
import Register from './modules/Auth/Register';
import ForgotPassword from './modules/Auth/ForgotPassword';
import Unauthorized from './modules/Auth/Unauthorized';
import GoogleCallback from './modules/Auth/GoogleCallback';
import MainLayout from './components/layout/MainLayout';
import Products from './modules/Products/Products';
import Services from './modules/Services/Services';
import Categories from './modules/Categories/Categories';
import Billing from './modules/Billing/Billing';
import Agenda from './modules/Agenda/Agenda';
import Wall from './modules/Wall/Wall';
import Statistics from './modules/Statistics/Statistics';
import Market from './modules/Market/Market';
import Profile from './modules/Profile/Profile';
import SocialAccountsAdmin from './modules/Admin/SocialAccountsAdmin';
import VerifyPublic from './Pages/VerifyPublic';
import ConfirmMention from './Pages/ConfirmMention';
import TokensAdmin from './modules/Admin/TokensAdmin';

import CustomCursor from './components/common/CustomCursor';
import Customers from './modules/Billing/Customers';
import { useStore } from './store/useStore';

const { ADMIN, SELLER, CLIENT } = APP_CONFIG.ROLES;

function App() {
  const { isAuthenticated } = useStore();

  useEffect(() => {
    // Ping the backend to wake up Render free tier instances
    const apiUrl = import.meta.env.VITE_API_URL || 'https://servinow-api.onrender.com';
    fetch(`${apiUrl}/api/v1/health`).catch(() => {});
  }, []);

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      {!isAuthenticated && <CustomCursor />}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/auth/callback" element={<GoogleCallback />} />
        <Route path="/verify/:cufe" element={<VerifyPublic />} />
        <Route path="/confirmar-mencion/:token" element={<ConfirmMention />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/categories" element={<Categories />} />
            <Route path="/products" element={<Products />} />
            <Route path="/services" element={<Services />} />
            <Route path="/customers" element={<Customers allowedRoles={[ADMIN, SELLER]} />} />
            <Route path="/billing" element={<Billing allowedRoles={[ADMIN, SELLER]} />} />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/wall" element={<Wall />} />
            <Route path="/statistics" element={<Statistics allowedRoles={[ADMIN]} />} />
            <Route path="/market" element={<Market allowedRoles={[ADMIN]} />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute isStaffRequired={true} />}>
          <Route element={<MainLayout />}>
            <Route path="/admin/social" element={<SocialAccountsAdmin />} />
            <Route path="/admin/tokens" element={<TokensAdmin />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/wall" replace />} />
      </Routes>
      <ToastContainer />
    </Router>
  );
}

export default App;
