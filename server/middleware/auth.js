const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "rydezindia_dev_secret";

function auth(requiredRole) {
  return (req, res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required" });
    }
    try {
      const token = header.split(" ")[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      if (requiredRole && decoded.role !== requiredRole) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }
      req.user = decoded;
      next();
    } catch {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  };
}

module.exports = { auth, JWT_SECRET };
