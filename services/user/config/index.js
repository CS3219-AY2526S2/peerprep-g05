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
};

export default config;
