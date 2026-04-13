export function isAdminRole(role: string | null | undefined): boolean {
    const normalizedRole = String(role || "")
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, "_");

    return normalizedRole === "ADMIN" || normalizedRole === "MASTER_ADMIN";
}

