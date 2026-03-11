import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import config from "../../config/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const keysDir = path.join(__dirname, "keys");
const privateKeyPath = path.join(keysDir, "private.pem");
const publicKeyPath = path.join(keysDir, "public.pem");

function ensureKeys() {
    if (fs.existsSync(privateKeyPath) && fs.existsSync(publicKeyPath)) {
        return;
    }

    console.log("[jwt] Generating RSA-2048 key pair …");
    if (!fs.existsSync(keysDir)) {
        fs.mkdirSync(keysDir, { recursive: true });
    }

    const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
        modulusLength: 2048,
        publicKeyEncoding: { type: "spki", format: "pem" },
        privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });

    fs.writeFileSync(privateKeyPath, privateKey);
    fs.writeFileSync(publicKeyPath, publicKey);
    console.log("[jwt] Keys written to infrastructure/security/keys/");
}

ensureKeys();

const PRIVATE_KEY = fs.readFileSync(privateKeyPath, "utf-8");
const PUBLIC_KEY = fs.readFileSync(publicKeyPath, "utf-8");

export function signToken(payload) {
    return jwt.sign(payload, PRIVATE_KEY, {
        algorithm: "RS256",
        expiresIn: config.jwt.expiry,
    });
}

export function verifyToken(token) {
    return jwt.verify(token, PUBLIC_KEY, { algorithms: ["RS256"] });
}

export function getPublicKey() {
    return PUBLIC_KEY;
}
