const express = require("express");
const Vehicle = require("../models/Vehicle");
const { auth } = require("../middleware/auth");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { category, location, oneWay } = req.query;
    const filter = { status: "active" };
    if (category) filter.category = category;
    if (location) filter.location = new RegExp(location, "i");
    if (oneWay === "true") filter.oneWay = true;
    const vehicles = await Vehicle.find(filter).populate("owner", "name rating");
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id).populate("owner", "name rating kycStatus");
    if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });
    res.json(vehicle);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", auth("owner"), async (req, res) => {
  try {
    const vehicle = await Vehicle.create({ ...req.body, owner: req.user.id });
    res.status(201).json(vehicle);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
