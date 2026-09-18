import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Images from "./pages/Images";
import Containers from "./pages/Containers";
import Volumes from "./pages/Volumes";
import Networks from "./pages/Networks";
import Stacks from "./pages/Stacks";
import Alerts from "./pages/Alerts";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import Billing from "./pages/Billing";
import AuditLog from "./pages/AuditLog";
import Landing from "./pages/Landing";
import Register from "./pages/Register";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import { WebSocketProvider } from "./context/WebSocketContext";
import Layout from "./Layout";
import RootRedirect from "./pages/RootRedirect";
import Servers from "./pages/Servers";
import RequireAuth from "./components/RequireAuth";

function App() {
  return (
    <>
      <BrowserRouter>
        <WebSocketProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/" element={<Landing />} />
            <Route element={<RequireAuth />}>
              <Route path="/dashboard" element={<RootRedirect />} />
              <Route path="/servers" element={<Servers />} />
              <Route path="/:serverId" element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="containers" element={<Containers />} />
                <Route path="images" element={<Images />} />
                <Route path="volumes" element={<Volumes />} />
                <Route path="networks" element={<Networks />} />
                <Route path="stacks" element={<Stacks />} />
                <Route path="alerts" element={<Alerts />} />
                <Route path="audit-log" element={<AuditLog />} />
                <Route path="billing" element={<Billing />} />
                <Route path="settings" element={<Settings />} />
                <Route path="profile" element={<Profile />} />
              </Route>
            </Route>
            {/* Fallback for 404 pages */}
            <Route path="*" element={<h2>Not Found!</h2>} />
          </Routes>
        </WebSocketProvider>
      </BrowserRouter>
    </>
  );
}

export default App;
