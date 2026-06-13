const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    pickupDate: { type: Date, required: true },
    returnDate: Date,
    pickupLocation: String,
    dropLocation: String,
    tripType: { type: String, enum: ["one-way", "round-trip"], default: "round-trip" },
    driveType: { type: String, enum: ["self-drive", "chauffeur"], default: "self-drive" },
    amount: Number,
    securityDeposit: Number,
    protectionFee: Number,
    status: {
      type: String,
      enum: ["pending", "confirmed", "active", "completed", "cancelled"],
      default: "pending",
    },
    paymentId: String,
    paymentStatus: { type: String, enum: ["pending", "paid", "refunded"], default: "pending" },
    gpsTracking: { lat: Number, lng: Number, lastUpdated: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Booking || mongoose.model("Booking", bookingSchema);
