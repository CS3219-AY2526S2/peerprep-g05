import { Route, Routes } from "react-router-dom";
import AdminOnlyRoute from "./components/AdminOnlyRoute.tsx";
import Navbar from "./components/Navbar.tsx";
import ProtectedRoute from "./components/Protectedroute.tsx";
import AdminUsers from "./pages/AdminUsers.tsx";
import CollaborativeEditor from "./pages/CollaborativeEditor.tsx";
import ForgotPassword from "./pages/ForgotPassword.tsx";
import Home from "./pages/Home.tsx";
import Matching from "./pages/Matching.tsx";
import QuestionDetail from "./pages/QuestionDetail.tsx";
import QuestionEditor from "./pages/QuestionEditor.tsx";
import Questions from "./pages/Questions.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import VerifyOtp from "./pages/VerifyOtp.tsx";

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/matching" element={<Matching />} />

          <Route path="/editor" element={<CollaborativeEditor />} />
        </Route>

        {/* Admin-only routes */}
        <Route
          path="/admin/users"
          element={
            <AdminOnlyRoute>
              <AdminUsers />
            </AdminOnlyRoute>
          }
        />
        <Route element={<ProtectedRoute />}>
          <Route path="/questions" element={<Questions />} />
          <Route
            path="/questions/new"
            element={
              <AdminOnlyRoute>
                <QuestionEditor />
              </AdminOnlyRoute>
            }
          />
          <Route path="/questions/:id" element={<QuestionDetail />} />
          <Route
            path="/questions/:id/edit"
            element={
              <AdminOnlyRoute>
                <QuestionEditor />
              </AdminOnlyRoute>
            }
          />
        </Route>
      </Routes>
    </>
  );
}
