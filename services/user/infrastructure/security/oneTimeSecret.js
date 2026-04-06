import crypto from "crypto";
import config from "../../config/index.js";

const isDevRuntime = ["development", "test"].includes(config.nodeEnv);
const DEV_FALLBACK_SECRET = "peerprep-user-service-dev-one-time-secret";

let runtimeSecret = process.env.ONE_TIME_SECRET || "";

if (!runtimeSecret) {
    if (!isDevRuntime) {
        throw new Error("ONE_TIME_SECRET must be set outside development/test environments");
    }

    runtimeSecret = DEV_FALLBACK_SECRET;
    console.warn("[one-time-secret] ONE_TIME_SECRET not set; using the stable development fallback secret");
}

export function digestOneTimeSecret(rawSecret) {
    return crypto
        .createHmac("sha256", runtimeSecret)
        .update(String(rawSecret))
        .digest("hex");
}

export function matchesStoredOneTimeSecret({ rawSecret, codeHash }) {
    if (!codeHash) {
        return false;
    }

    const storedHash = Buffer.from(codeHash, "hex");
    const candidateHash = Buffer.from(digestOneTimeSecret(rawSecret), "hex");

    if (storedHash.length !== candidateHash.length) {
        return false;
    }

    return crypto.timingSafeEqual(storedHash, candidateHash);
}
