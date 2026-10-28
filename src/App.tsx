import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AuthProvider, useAuth, getDashboardPath } from './contexts/AuthContext'
import ProtectedRoute from './routes/ProtectedRoute'

import LoginPage from './pages/auth/LoginPage'
import ForgotPassword from './pages/auth/ForgotPassword'
import SignUp from './pages/auth/SignUp'
import ResetPassword from './pages/auth/ResetPassword'
import LockScreen from './pages/auth/LockScreen'

import DashboardPage from './pages/DashboardPage'
import ShipmentsPage from './pages/shipments/ShipmentsPage'
import BranchesPage from './pages/branches/BranchesPage'
import CustomersPage from './pages/customers/CustomersPage'
import AgentsPage from './pages/agents/AgentsPage'
import PricingPage from './pages/pricing/PricingPage'
import TrackingPage from './pages/tracking/TrackingPage'
import AssignmentsPage from './pages/assignments/AssignmentsPage'
import PaymentsPage from './pages/payments/PaymentsPage'
import ReportsPage from './pages/reports/ReportsPage'
import SettingsPage from './pages/settings/SettingsPage'

import CreateShipmentPage from './pages/shipments/CreateShipmentPage'
import TrackParcelPage from './pages/tracking/TrackParcelPage'
import MyDeliveriesPage from './pages/agents/MyDeliveriesPage'
import AgentTrackingPage from './pages/tracking/AgentTrackingPage'
import BranchAgentsPage from './pages/agents/BranchAgentsPage'
import BranchTrackingPage from './pages/tracking/BranchTrackingPage' 

function HomeRedirect() {
  const { user } = useAuth()

  return (
    <Navigate
      to={user ? getDashboardPath(user.role) : '/login'}
      replace
    />
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/lock-screen" element={<LockScreen />} />

          {/* Admin routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin/dashboard" element={<DashboardPage />} />
            <Route path="/admin/shipments" element={<ShipmentsPage />} />
            <Route path="/admin/assignments" element={<AssignmentsPage />} />
            <Route path="/admin/branches" element={<BranchesPage />} />
            <Route path="/admin/agents" element={<AgentsPage />} />
            <Route path="/admin/customers" element={<CustomersPage />} />
            <Route path="/admin/pricing" element={<PricingPage />} />
            <Route path="/admin/tracking" element={<TrackingPage />} />
            <Route path="/admin/payments" element={<PaymentsPage />} />
            <Route path="/admin/reports" element={<ReportsPage />} />
            <Route path="/admin/settings" element={<SettingsPage />} />
          </Route>

{/* Branch Staff routes */}
<Route element={<ProtectedRoute allowedRoles={['branch_staff']} />}>
  <Route path="/branch/dashboard" element={<DashboardPage />} />
  <Route path="/branch/shipments" element={<ShipmentsPage />} />
  <Route path="/branch/assignments" element={<AssignmentsPage />} />
  <Route path="/branch/branches" element={<BranchesPage />} />
  <Route path="/branch/agents" element={<BranchAgentsPage />} />
  <Route path="/branch/tracking" element={<BranchTrackingPage />} /> 
</Route> 

      
{/* Delivery Agent routes */}
<Route element={<ProtectedRoute allowedRoles={['delivery_agent']} />}>
  <Route path="/agent/dashboard" element={<DashboardPage />} />
  <Route path="/agent/shipments" element={<ShipmentsPage />} />
  <Route path="/agent/deliveries" element={<MyDeliveriesPage />} />
  <Route path="/agent/tracking" element={<AgentTrackingPage />} /> 
</Route>


        {/* Customer routes */}
<Route element={<ProtectedRoute allowedRoles={['customer']} />}>
  <Route path="/customer/dashboard" element={<DashboardPage />} />
  <Route path="/customer/shipments" element={<ShipmentsPage />} />
  <Route path="/customer/payments" element={<PaymentsPage />} />
  <Route
    path="/customer/create-shipment"
    element={<CreateShipmentPage />}
  />
  <Route path="/customer/track" element={<TrackParcelPage />} /> 
</Route>

          {/* Unknown routes */}
          <Route path="*" element={<HomeRedirect />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
