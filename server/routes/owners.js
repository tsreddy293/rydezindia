const express = require("express");
const Vehicle = require("../models/Vehicle");
const Booking = require("../models/Booking");
const { auth } = require("../middleware/auth");

const router = express.Router();

router.get("/dashboard", auth("owner"), async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ owner: req.user.id });
    const bookings = await Booking.find({ owner: req.user.id });
    const completed = bookings.filter((b) => b.status === "completed");
    const totalEarnings = completed.reduce((sum, b) => sum + (b.amount || 0), 0);

    res.json({
      totalEarnings,
      activeVehicles: vehicles.filter((v) => v.status === "active").length,
      upcomingBookings: bookings.filter((b) => b.status === "confirmed").length,
      completedTrips: completed.length,
      aiEarningsPrediction: Math.round(totalEarnings * 0.35),
      vehicles,
      bookingRequests: bookings.filter((b) => b.status === "pending"),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/register", auth(), async (req, res) => {
  try {
    const vehicle = await Vehicle.create({ ...req.body.vehicle, owner: req.user.id, status: "pending" });
    res.status(201).json({ message: "Registration submitted for review", vehicle });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
