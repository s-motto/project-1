import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import BottomNav from "./components/BottomNav";
import UserMenu from "./components/UserMenu";
import ToastContainer from "./components/ToastContainer";

// Lazy loading dei componenti pesanti
const RouteSearchForm = lazy(() => import("./components/RouteSearchForm"));
const SavedRoutes = lazy(() => import("./components/SavedRoutes"));
const Dashboard = lazy(() => import("./components/Dashboard"));
const Achievements = lazy(() => import("./components/Achievements"));
const NearbyHikes = lazy(() => import("./components/NearbyHikes"));
const ResetPassword = lazy(() => import("./components/ResetPassword"));

const LoadingSpinner = () => (
  <div className="loading-spinner">
    <div className="spinner"></div>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <ToastContainer />

      <div className="page-container">
        {/* Header */}
        <header className="app-header">
          <div className="header-container">
            <div
              className="logo-container cursor-pointer"
              onClick={() => (window.location.href = "/")}
            >
              <div className="logo-icon">🚶</div>
              <div className="logo-text-container">
                <h1 className="logo-title">Let's Walk!</h1>
                <p className="logo-subtitle">Ciao! Dove andiamo oggi?</p>
              </div>
            </div>
            <UserMenu />
          </div>
        </header>

        {/* Main Content */}
        <main className="content-wrapper">
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/" element={<RouteSearchForm />} />
              <Route path="/saved" element={<SavedRoutes />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/achievements" element={<Achievements />} />
              <Route path="/nearby" element={<NearbyHikes />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>

        {/* Bottom Navigation */}
        <BottomNav />
      </div>
    </BrowserRouter>
  );
}

export default App;
