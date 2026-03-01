/**
 * User domain model.
 * Provides a safe serialisation that never exposes password_hash.
 */
export default class User {
    constructor(row) {
        this.id = row.id;
        this.email = row.email;
        this.username = row.username;
        this.role = row.role;
        this.displayName = row.display_name ?? row.displayName ?? null;
        this.isActive = row.is_active ?? row.isActive ?? true;
        this.createdAt = row.created_at ?? row.createdAt;
        this.updatedAt = row.updated_at ?? row.updatedAt;
    }

    toJSON() {
        return {
            id: this.id,
            email: this.email,
            username: this.username,
            role: this.role,
            displayName: this.displayName,
            isActive: this.isActive,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
}
