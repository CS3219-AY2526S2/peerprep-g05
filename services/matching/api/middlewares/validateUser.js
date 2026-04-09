export const validateUser = async (req, res, next) => {
    try {
        let token = null;

        // 1. Try Authorization header (for non-browser / service calls)
        const authHeader = req.headers.authorization;
        if (authHeader) {
            const parts = authHeader.split(" ");
            if (parts.length === 2 && parts[0] === "Bearer") {
                token = parts[1];
            }
        }

        // 2. Fallback to HttpOnly cookie (for browser calls)
        if (!token && req.headers.cookie) {
            const cookies = Object.fromEntries(
                req.headers.cookie.split("; ").map(cookie => {
                    const [key, value] = cookie.split("=");
                    return [key, value];
                })
            );

            token = cookies["peerprep_access_token"];
        }

        // 3. Reject if no token found
        if (!token) {
            return res.status(401).json({
                error: "Unauthorized",
                message: "No token provided (Authorization header or cookie)"
            });
        }

        // 4. Ensure gateway URL exists
        const gatewayUrl = process.env.GATEWAY_URL;
        if (!gatewayUrl) {
            console.error("GATEWAY_URL is not set");
            return res.status(500).json({
                error: "Internal Server Error",
                message: "Service configuration error"
            });
        }

        // 5. Call introspection endpoint
        const response = await fetch(`${gatewayUrl}/api/v1/auth/introspect`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ token })
        });

        if (!response.ok) {
            console.error(`Introspection failed: ${response.status}`);
            return res.status(503).json({
                error: "Service Unavailable",
                message: "Unable to validate token"
            });
        }

        const data = await response.json();

        // 6. Validate token
        if (!data.active) {
            return res.status(401).json({
                error: "Unauthorized",
                message: "Invalid or expired token"
            });
        }

        // 7. Attach trusted user identity
        req.user = {
            userId: data.userId,
            role: data.role,
            accountRole: data.accountRole,
            exp: data.exp
        };

        // 8. Continue request
        next();

    } catch (error) {
        console.error("validateUser error:", error);
        return res.status(500).json({
            error: "Internal Server Error",
            message: "Failed to validate token"
        });
    }
};