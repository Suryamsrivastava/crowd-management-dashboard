import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { LiveProvider } from './context/LiveContext';
import Login from './pages/Login';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const CrowdEntries = lazy(() => import('./pages/CrowdEntries'));

const Loader = () => <div className="page-loader" aria-label="Loading" />;

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route
              element={
                <LiveProvider>
                  <Layout />
                </LiveProvider>
              }
            >
              <Route
                index
                element={
                  <Suspense fallback={<Loader />}>
                    <Dashboard />
                  </Suspense>
                }
              />
              <Route
                path="entries"
                element={
                  <Suspense fallback={<Loader />}>
                    <CrowdEntries />
                  </Suspense>
                }
              />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
