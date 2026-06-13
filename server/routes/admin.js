const express = require("express");
const User = require("../models/User");
const Vehicle = require("../models/Vehicle");
const Booking = require("../models/Booking");
const { auth } = require("../middleware/auth");

const router = express.Router();

router.use(auth("admin"));

router.get("/stats", async (_req, res) => {
  try {
    const [totalOwners, totalVehicles, totalBookings, pendingVehicles, pendingKYC, activeTrips] = await Promise.all([
      User.countDocuments({ role: "owner" }),
      Vehicle.countDocuments(),
      Booking.countDocuments(),
      Vehicle.countDocuments({ status: "pending" }),
      User.countDocuments({ kycStatus: "pending" }),
      Booking.countDocuments({ status: "active" }),
    ]);
    const revenue = await Booking.aggregate([
      { $match: { paymentStatus: "paid" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    res.json({
      totalOwners,
      totalVehicles,
      totalBookings,
      pendingApprovals: pendingVehicles,
      pendingKYC,
      activeTrips,
      revenue: revenue[0]?.total || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/vehicles/:id/approve", async (req, res) => {
  try {
    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, { status: "active" }, { new: true });
    res.json(vehicle);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/users/:id/kyc", async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { kycStatus: req.body.status }, { new: true });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
