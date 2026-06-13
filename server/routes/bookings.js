const express = require("express");
const Booking = require("../models/Booking");
const Vehicle = require("../models/Vehicle");
const { auth } = require("../middleware/auth");

const router = express.Router();

router.get("/", auth(), async (req, res) => {
  try {
    const filter = req.user.role === "owner" ? { owner: req.user.id } : { user: req.user.id };
    const bookings = await Booking.find(filter)
      .populate("vehicle", "name images pricePerDay")
      .populate("user", "name mobile")
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", auth(), async (req, res) => {
  try {
    const { vehicleId, pickupDate, returnDate, pickupLocation, dropLocation, tripType, driveType } = req.body;
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });

    const days = Math.max(1, Math.ceil((new Date(returnDate) - new Date(pickupDate)) / (1000 * 60 * 60 * 24)));
    const amount = vehicle.pricePerDay * days + (vehicle.protectionFee || 0);

    const booking = await Booking.create({
      user: req.user.id,
      vehicle: vehicleId,
      owner: vehicle.owner,
      pickupDate,
      returnDate,
      pickupLocation,
      dropLocation,
      tripType,
      driveType,
      amount,
      securityDeposit: vehicle.securityDeposit,
      protectionFee: vehicle.protectionFee,
    });

    res.status(201).json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id/status", auth(), async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
