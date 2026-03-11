import { useAuth } from "../context/AuthContext.tsx";
import AuthOverlay from "../components/AuthOverlay.tsx";
import "./Home.css";

export default function Home() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="home">
                <p className="loading-text">Loading…</p>
            </div>
        );
    }

    return (
        <div className="home">
            {!user && <AuthOverlay />}

            <div className="home-content">
                <h1>Welcome to PeerPrep</h1>
                <p className="tagline">Collaborative technical interview preparation</p>

                {user && (
                    <div className="user-card">
                        <h3>Your Profile</h3>
                        <table>
                            <tbody>
                                <tr><td><strong>Username</strong></td><td>{user.username}</td></tr>
                                <tr><td><strong>Display Name</strong></td><td>{user.display_name}</td></tr>
                                <tr><td><strong>Email</strong></td><td>{user.email}</td></tr>
                                <tr><td><strong>Role</strong></td><td>{user.role}</td></tr>
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
