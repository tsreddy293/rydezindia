const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    brand: String,
    model: String,
    year: Number,
    category: {
      type: String,
      enum: ["hatchback", "sedan", "suv", "luxury", "electric", "tempo"],
    },
    registrationNumber: String,
    images: [String],
    pricePerDay: { type: Number, required: true },
    pricePerKm: Number,
    securityDeposit: Number,
    protectionFee: Number,
    location: String,
    features: [String],
    specs: {
      fuel: String,
      transmission: String,
      seats: Number,
      mileage: String,
      engine: String,
    },
    status: { type: String, enum: ["pending", "active", "inactive", "on-trip"], default: "pending" },
    gpsStatus: { type: String, enum: ["online", "offline"], default: "offline" },
    oneWay: { type: Boolean, default: false },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    documents: {
      rc: String,
      insurance: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Vehicle || mongoose.model("Vehicle", vehicleSchema);
