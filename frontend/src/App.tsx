import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar.tsx";
import Home from "./pages/Home.tsx";
import VerifyOtp from "./pages/VerifyOtp.tsx";
import ForgotPassword from "./pages/ForgotPassword.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import AdminUsers from "./pages/AdminUsers.tsx";
import Questions from "./pages/Questions.tsx";
import QuestionDetail from "./pages/QuestionDetail.tsx";
import QuestionEditor from "./pages/QuestionEditor.tsx";
import AdminOnlyRoute from "./components/AdminOnlyRoute.tsx";
import Matching from "./pages/Matching.tsx";

export default function App() {
    return (
        <>
            <Navbar />
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/verify-otp" element={<VerifyOtp />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/matching" element={<Matching />} />
                <Route
                    path="/admin/users"
                    element={(
                        <AdminOnlyRoute>
                            <AdminUsers />
                        </AdminOnlyRoute>
                    )}
                />
                <Route path="/questions" element={<Questions />} />
                <Route
                    path="/questions/new"
                    element={(
                        <AdminOnlyRoute>
                            <QuestionEditor />
                        </AdminOnlyRoute>
                    )}
                />
                <Route path="/questions/:id" element={<QuestionDetail />} />
                <Route
                    path="/questions/:id/edit"
                    element={(
                        <AdminOnlyRoute>
                            <QuestionEditor />
                        </AdminOnlyRoute>
                    )}
                />
            </Routes>
        </>
    );
}

