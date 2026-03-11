import dotenv from "dotenv";
dotenv.config();

const config = {
    port: parseInt(process.env.PORT, 10) || 3001,
    nodeEnv: process.env.NODE_ENV || "development",

    database: {
        url: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/peerprep_users",
    },

    jwt: {
        expiry: parseInt(process.env.JWT_EXPIRY, 10) || 3600, // tentative
    },

    email: {
        user: process.env.SMTP_USER || "",
        appPassword: process.env.SMTP_APP_PASSWORD || "",
        from: process.env.SMTP_FROM || "PeerPrep <peerprep.g05@gmail.com>",
    },

    otp: {
        expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES, 10) || 10,
    },

    frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",

    passwordReset: {
        expiryMinutes: parseInt(process.env.PASSWORD_RESET_EXPIRY_MINUTES, 10) || 30,
    },
};

export default config;
