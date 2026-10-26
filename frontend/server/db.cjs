const mongoose = require('mongoose')
require('dotenv').config()

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cansat_telemetry'

let isConnected = false
let connectionError = null

let hasLoggedError = false

mongoose.set('strictQuery', false)

mongoose.connection.on('connected', () => {
  isConnected = true
  connectionError = null
  hasLoggedError = false
  console.log(`[MongoDB] Connected successfully to ${MONGODB_URI}`)
})

mongoose.connection.on('error', (err) => {
  isConnected = false
  connectionError = err.message
  if (!hasLoggedError) {
    hasLoggedError = true
    console.warn(`[MongoDB] Connection notice: ${err.message}. Retrying in background...`)
  }
})

mongoose.connection.on('disconnected', () => {
  isConnected = false
  if (!hasLoggedError) {
    console.warn('[MongoDB] Disconnected from server')
  }
})

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 2000,
      connectTimeoutMS: 3000,
    })
  } catch (err) {
    isConnected = false
    connectionError = err.message
    if (!hasLoggedError) {
      hasLoggedError = true
      console.warn(`[MongoDB] Notice: Could not connect to MongoDB at ${MONGODB_URI}.`)
      console.warn('[MongoDB] Operating with local file logging and auto-retry in background.')
    }
    
    // Auto-retry in background every 30 seconds
    setTimeout(connectDB, 30000)
  }
}

function getMongoStatus() {
  return {
    connected: isConnected,
    uri: MONGODB_URI.replace(/:([^:@]{1,})@/, ':****@'), // mask password if present
    database: mongoose.connection?.name || 'cansat_telemetry',
    error: connectionError
  }
}

module.exports = {
  connectDB,
  getMongoStatus,
  isMongoConnected: () => isConnected
}
