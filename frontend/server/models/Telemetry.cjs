const mongoose = require('mongoose')

const TelemetrySchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  packet: {
    type: Number,
    required: true,
    index: true
  },
  pressure: {
    type: Number, // hPa
    required: true
  },
  altitude: {
    type: Number, // meters
    required: true
  },
  velocity: {
    type: Number, // m/s
    required: true
  },
  orientationX: {
    type: Number, // deg
    required: true
  },
  orientationY: {
    type: Number, // deg
    required: true
  },
  orientationZ: {
    type: Number, // deg
    required: true
  },
  batteryVoltage: {
    type: Number, // V
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
})

// Compound index for querying telemetry points for a given session efficiently
TelemetrySchema.index({ sessionId: 1, packet: 1 })

module.exports = mongoose.model('Telemetry', TelemetrySchema)
