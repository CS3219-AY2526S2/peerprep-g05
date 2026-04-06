import jwt from "jsonwebtoken";
import crypto from "crypto";
import config from "../../config/index.js";

const isDevRuntime = ["development", "test"].includes(config.nodeEnv);

let runtimeKeys = null;

function normalizeKey(value) {
    return value ? value.replace(/\\n/g, "\n") : "";
}

function getKeys() {
    const privateKey = normalizeKey(process.env.JWT_PRIVATE_KEY);
    const publicKey = normalizeKey(process.env.JWT_PUBLIC_KEY);

    if (privateKey && publicKey) {
        return { privateKey, publicKey };
    }

    if (!isDevRuntime) {
        throw new Error("JWT_PRIVATE_KEY and JWT_PUBLIC_KEY must be set outside development/test environments");
    }

    if (!runtimeKeys) {
        console.warn("[jwt] JWT keys not configured; generating an ephemeral in-memory RSA-2048 key pair for development/test");

        const { publicKey: generatedPublicKey, privateKey: generatedPrivateKey } = crypto.generateKeyPairSync("rsa", {
            modulusLength: 2048,
            publicKeyEncoding: { type: "spki", format: "pem" },
            privateKeyEncoding: { type: "pkcs8", format: "pem" },
        });

        runtimeKeys = {
            privateKey: generatedPrivateKey,
            publicKey: generatedPublicKey,
        };
    }

    return runtimeKeys;
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
