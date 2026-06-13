const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    mobile: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["user", "owner", "admin"], default: "user" },
    city: String,
    kycStatus: { type: String, enum: ["pending", "verified", "rejected"], default: "pending" },
    aadhaar: String,
    pan: String,
    drivingLicence: String,
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: "Vehicle" }],
    savedVehicles: [{ type: mongoose.Schema.Types.ObjectId, ref: "Vehicle" }],
    otp: String,
    otpExpiry: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
