export const ROLES = Object.freeze({
    USER: "USER",
    ADMIN: "ADMIN",
    MASTER_ADMIN: "MASTER_ADMIN",
});

export const API_ASSIGNABLE_ROLES = Object.freeze([
    ROLES.USER,
    ROLES.ADMIN,
]);

export function isAdminRole(role) {
    return role === ROLES.ADMIN || role === ROLES.MASTER_ADMIN;
}

export function toExternalRole(role) {
    return role === ROLES.MASTER_ADMIN ? ROLES.ADMIN : role;
}

