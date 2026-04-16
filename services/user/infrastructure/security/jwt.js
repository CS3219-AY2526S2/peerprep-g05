import jwt from "jsonwebtoken";
import config from "../../config/index.js";

function normalizeKey(value) {
    return value ? value.replace(/\\n/g, "\n") : "";
}

function getKeys() {
    const privateKey = normalizeKey(process.env.JWT_PRIVATE_KEY);
    const publicKey = normalizeKey(process.env.JWT_PUBLIC_KEY);

    if (privateKey && publicKey) {
        return { privateKey, publicKey };
    }

    throw new Error("JWT_PRIVATE_KEY and JWT_PUBLIC_KEY must be set");
}

const { privateKey: PRIVATE_KEY, publicKey: PUBLIC_KEY } = getKeys();

export function signToken(payload) {
    return jwt.sign(payload, PRIVATE_KEY, {
        algorithm: "RS256",
        expiresIn: config.jwt.expiry,
    });
}

export function verifyToken(token) {
    return jwt.verify(token, PUBLIC_KEY, { algorithms: ["RS256"] });
}

export function isTokenFresh(decoded, tokenValidAfter) {
    if (!tokenValidAfter) {
        return true;
    }

    if (!decoded?.iat) {
        return false;
    }

    const validAfterSeconds = Math.floor(new Date(tokenValidAfter).getTime() / 1000);
    return decoded.iat >= validAfterSeconds;
}

export function getPublicKey() {
    return PUBLIC_KEY;
}
