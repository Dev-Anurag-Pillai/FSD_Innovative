const mongoose = require('mongoose')

const SessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  title: {
    type: String,
    default: 'Mission Flight Session'
  },
  startTime: {
    type: Date,
    default: Date.now,
    index: true
  },
  endTime: {
    type: Date
  },
  durationSeconds: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'aborted'],
    default: 'active'
  },
  jsonFileName: {
    type: String,
    required: true
  },
  csvFileName: {
    type: String,
    required: true
  },
  packetCount: {
    type: Number,
    default: 0
  },
  stats: {
    maxAltitude: { type: Number, default: 0 },
    minAltitude: { type: Number, default: 0 },
    maxVelocity: { type: Number, default: 0 },
    minVelocity: { type: Number, default: 0 },
    avgPressure: { type: Number, default: 0 },
    minBatteryVoltage: { type: Number, default: 0 },
    maxBatteryVoltage: { type: Number, default: 0 },
  },
  commandsLogged: [{
    command: String,
    timestamp: { type: Date, default: Date.now },
    status: String,
    details: String
  }],
  source: {
    type: String,
    enum: ['esp32_hardware', 'flight_simulator'],
    default: 'esp32_hardware'
  }
}, {
  timestamps: true
})

module.exports = mongoose.model('Session', SessionSchema)
