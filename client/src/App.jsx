import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Home from "./pages/Home";
import Sidebar from "./components/Sidebar";
import Images from "./pages/Images";
import Containers from "./pages/Containers";
import Settings from "./pages/Settings";
import Infrastructure from "./pages/Infrastructure";
import Register from "./pages/Register";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import { WebSocketProvider } from "./context/WebSocketContext";
import Layout from "./Layout";
import RootRedirect from "./pages/RootRedirect";
import Servers from "./pages/Servers";

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
            <Route path="/" element={<RootRedirect />} />
            <Route path="/servers" element={<Servers />} />
            
            <Route  path="/:serverId" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="containers" element={<Containers />} />
              <Route path="images" element={<Images />} />
              <Route path="settings" element={<Settings />} />
              <Route path="infrastructure" element={<Infrastructure />} />
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
