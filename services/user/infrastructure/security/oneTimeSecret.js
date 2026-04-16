import crypto from "crypto";

const runtimeSecret = process.env.ONE_TIME_SECRET || "";

if (!runtimeSecret) {
    throw new Error("ONE_TIME_SECRET must be set");
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
