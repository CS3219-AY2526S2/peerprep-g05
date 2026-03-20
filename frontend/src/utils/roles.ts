export function isAdminRole(role: string | null | undefined): boolean {
    return role === "ADMIN" || role === "MASTER_ADMIN";
}

