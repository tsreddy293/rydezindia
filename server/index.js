require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const authRoutes = require("./routes/auth");
const vehicleRoutes = require("./routes/vehicles");
const bookingRoutes = require("./routes/bookings");
const ownerRoutes = require("./routes/owners");
const adminRoutes = require("./routes/admin");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:3000" }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "Rydez India API", version: "1.0.0" });
});

app.use("/api/auth", authRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/owners", ownerRoutes);
app.use("/api/admin", adminRoutes);

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/rydezindia";

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => console.log(`Rydez India API running on port ${PORT}`));
  })
  .catch((err) => {
    console.warn("MongoDB connection failed, starting server without DB:", err.message);
    app.listen(PORT, () => console.log(`Rydez India API running on port ${PORT} (no DB)`));
  });
