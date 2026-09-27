const jwt = require('jsonwebtoken');

// ============================================================
//  Authentication & Authorization Middleware
// ============================================================

// ── protect ────────────────────────────────────────────────────
// Validates the JWT token sent in the Authorization header.
// If the token is valid, attaches decoded user info (id, role)
// to req.user so downstream controllers know who is calling.
// Usage: add protect as middleware before any protected route.
const protect = (req, res, next) => {
    let token;

    // DEBUG: Log received Authorization header (trim to avoid leaking full token)
    console.log(`[AUTH] ${req.method} ${req.originalUrl} — Authorization header: ${req.headers.authorization ? req.headers.authorization.substring(0, 30) + '...' : 'MISSING'}`);

    // VALIDATION: Token must be present in Authorization header as "Bearer <token>"
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    }

    // VALIDATION: Reject request if no token is found
    if (!token) {
        console.log('[AUTH] REJECTED — No token found');
        return res.status(401).json({ success: false, error: 'Not authorized to access this route' });
    }

    try {
        // VALIDATION: Verify token signature and expiry using the JWT_SECRET from .env
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { id, role } from generateToken()
        next();
    } catch (err) {
        // Token is expired or tampered — reject the request
        return res.status(401).json({ success: false, error: 'Not authorized to access this route' });
    }
};

// ── authorize (…roles) ─────────────────────────────────────────
// Role-based access control.  Must be used AFTER protect.
// Accepts a list of allowed roles; rejects anyone whose role
// is not in the list.  Example: authorize('admin', 'teacher')
const authorize = (...roles) => {
    return (req, res, next) => {
        // VALIDATION: Check the caller's role (set by protect) against allowed roles
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: `User role ${req.user.role} is not authorized to access this route`
            });
        }
        next();
    };
};

// ── requireSelfOrAdmin(paramName) ─────────────────────────────
// FIX (SECURITY_AUDIT.md Finding 3 — A01 Broken Access Control / IDOR):
// `protect` only proves the caller HAS a valid token — it never checked that the token
// belongs to the same person as the :userId in the URL. That let any logged-in student/
// teacher read or edit ANY other student's/teacher's profile (and change their password)
// just by swapping the id in the URL. This middleware closes that gap at the route layer:
// it must run AFTER protect, and only lets the request through if the authenticated user
// is acting on their own record (req.user.id === req.params[paramName]) or is an admin.
const requireSelfOrAdmin = (paramName = 'userId') => {
    return (req, res, next) => {
        if (req.user.role === 'admin' || req.user.id === req.params[paramName]) {
            return next();
        }
        return res.status(403).json({
            success: false,
            error: 'Not authorized to access this resource'
        });
    };
};

module.exports = { protect, authorize, requireSelfOrAdmin };
