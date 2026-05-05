import { useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { ToastHost } from "./components/ToastHost";
import { SplashScreen } from "./components/SplashScreen";
import { CursorBackground } from "./components/CursorBackground";
import { RequireAuth } from "./components/RequireAuth";
import { PublicLayout } from "./components/layout/PublicLayout";
import { AuthLayout } from "./components/layout/AuthLayout";
import { DashboardLayout } from "./components/dashboard/DashboardLayout";
import { HomePage } from "./pages/HomePage";
import { EventDetailPage } from "./pages/EventDetailPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardHomePage } from "./pages/dashboard/DashboardHomePage";
import { PaymentsPage } from "./pages/dashboard/PaymentsPage";
import { PromotionsPage } from "./pages/dashboard/PromotionsPage";
import { NotificationsPage } from "./pages/dashboard/NotificationsPage";
import { EventsManagementPage } from "./pages/dashboard/EventsManagementPage";
import { SitesManagementPage } from "./pages/dashboard/SitesManagementPage";
import { AgendasManagementPage } from "./pages/dashboard/AgendasManagementPage";
import { SurveysManagementPage } from "./pages/dashboard/SurveysManagementPage";
import { SecurityManagementPage } from "./pages/dashboard/SecurityManagementPage";
import { MyTicketsPage } from "./pages/MyTicketsPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { VerifyEmailPage } from "./pages/VerifyEmailPage";

export default function App() {
  const [splashComplete, setSplashComplete] = useState(() => {
    return sessionStorage.getItem("carivent-splash-shown") === "true";
  });

  const handleSplashComplete = () => {
    sessionStorage.setItem("carivent-splash-shown", "true");
    setSplashComplete(true);
  };

  if (!splashComplete) {
    return (
      <>
        <SplashScreen onComplete={handleSplashComplete} minimumDuration={2200} />
        <BrowserRouter>
          <AuthProvider>
            <ToastProvider>
              <ToastHost />
            </ToastProvider>
          </AuthProvider>
        </BrowserRouter>
      </>
    );
  }

  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <ToastHost />
          <CursorBackground />
          <Routes>
            <Route element={<PublicLayout />}>
              <Route index element={<HomePage />} />
              <Route path="eventos/:id" element={<EventDetailPage />} />
              <Route path="comprar/:eventId" element={<CheckoutPage />} />
              <Route element={<RequireAuth />}>
                <Route path="mis-tickets" element={<MyTicketsPage />} />
              </Route>
            </Route>
            <Route element={<AuthLayout />}>
              <Route path="login" element={<LoginPage />} />
              <Route path="registro" element={<RegisterPage />} />
              <Route path="forgot-password" element={<ForgotPasswordPage />} />
              <Route path="reset-password" element={<ResetPasswordPage />} />
              <Route path="verify-email" element={<VerifyEmailPage />} />
            </Route>
            <Route element={<RequireAuth />}>
              <Route path="app" element={<DashboardLayout />}>
                <Route index element={<DashboardHomePage />} />
                <Route path="pagos" element={<PaymentsPage />} />
                <Route path="promociones" element={<PromotionsPage />} />
                <Route path="notificaciones" element={<NotificationsPage />} />
                <Route path="eventos" element={<EventsManagementPage />} />
                <Route path="sitios" element={<SitesManagementPage />} />
                <Route path="agendas" element={<AgendasManagementPage />} />
                <Route path="encuestas" element={<SurveysManagementPage />} />
                <Route path="seguridad" element={<SecurityManagementPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
