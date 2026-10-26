// Realistic CanSat Flight & Sensor Simulator
let flightState = 'IDLE' // IDLE, ASCENDING, APOGEE, DESCENT_FREEFALL, DESCENT_PARACHUTE, LANDED
let packetCounter = 0
let altitude = 0.0
let velocity = 0.0
let pressure = 1013.25 // hPa
let batteryVoltage = 4.18
let orientationX = 0.0 // heading / yaw
let orientationY = 0.0 // roll
let orientationZ = 0.0 // pitch
let referencePressure = 1013.25
let parachuteDeployed = false
let timeInState = 0

function resetSimulator() {
  packetCounter = 0
  altitude = 0.0
  velocity = 0.0
  pressure = referencePressure
  flightState = 'IDLE'
  parachuteDeployed = false
  orientationX = 0.0
  orientationY = 0.0
  orientationZ = 0.0
}

function calibrateSimulator() {
  referencePressure = 1013.25 + (Math.random() * 0.4 - 0.2)
  altitude = 0.0
  velocity = 0.0
  orientationX = 0.0
  orientationY = 0.0
  orientationZ = 0.0
}

function launchSimulator() {
  flightState = 'ASCENDING'
  altitude = 1.0
  velocity = 35.0 // 35 m/s upward thrust
  timeInState = 0
}

function startFlightSimulation() {
  resetSimulator()
  launchSimulator()
  return {
    state: flightState,
    altitude,
    velocity,
    packet: packetCounter
  }
}

function ejectSimulator() {
  parachuteDeployed = true
  if (flightState === 'DESCENT_FREEFALL' || flightState === 'ASCENDING' || flightState === 'APOGEE') {
    flightState = 'DESCENT_PARACHUTE'
  }
}

// Called at 16 Hz (every ~62ms)
function stepSimulator() {
  const dt = 0.0625 // 1/16th second
  packetCounter++
  timeInState += dt

  // Battery slowly discharges
  batteryVoltage = Math.max(3.3, batteryVoltage - 0.00002)

  switch (flightState) {
    case 'IDLE':
      // Gentle jitter on launchpad
      altitude = Math.max(0, (Math.random() * 0.1 - 0.05))
      velocity = 0.0
      orientationX = (orientationX + Math.sin(packetCounter * 0.05) * 0.2) % 360
      orientationY = Math.sin(packetCounter * 0.08) * 1.5
      orientationZ = Math.cos(packetCounter * 0.08) * 1.5
      break

    case 'ASCENDING':
      // Rocket engine burning, then coasting upward
      velocity -= 9.81 * dt // gravity deceleration
      altitude += velocity * dt
      // High turbulence / oscillation
      orientationX = (orientationX + (Math.random() - 0.5) * 6) % 360
      orientationY = Math.sin(packetCounter * 0.3) * 12 + (Math.random() - 0.5) * 5
      orientationZ = Math.cos(packetCounter * 0.3) * 12 + (Math.random() - 0.5) * 5

      if (velocity <= 0) {
        flightState = 'APOGEE'
        timeInState = 0
      }
      break

    case 'APOGEE':
      altitude += velocity * dt
      velocity -= 9.81 * dt
      orientationY = Math.sin(packetCounter * 0.1) * 20
      orientationZ = Math.cos(packetCounter * 0.1) * 20

      // Auto deploy parachute after 1.5s at apogee if not already deployed
      if (timeInState > 1.5 || parachuteDeployed) {
        flightState = parachuteDeployed ? 'DESCENT_PARACHUTE' : 'DESCENT_FREEFALL'
      }
      break

    case 'DESCENT_FREEFALL':
      velocity -= 9.81 * dt
      velocity = Math.max(velocity, -45.0) // Terminal velocity ~45 m/s without chute
      altitude += velocity * dt
      // Fast tumbling
      orientationX = (orientationX + 8) % 360
      orientationY = (orientationY + 12) % 360
      orientationZ = (orientationZ + 9) % 360

      if (altitude <= 0) {
        altitude = 0
        velocity = 0
        flightState = 'LANDED'
      }
      break

    case 'DESCENT_PARACHUTE':
      // Parachute slows descent to safe ~5.5 m/s
      const targetTerminalVelocity = -5.5
      velocity += (targetTerminalVelocity - velocity) * 0.08
      altitude += velocity * dt
      // Gentle pendulum sway under parachute
      orientationX = (orientationX + 0.4) % 360
      orientationY = Math.sin(packetCounter * 0.15) * 14
      orientationZ = Math.cos(packetCounter * 0.15) * 14

      if (altitude <= 0) {
        altitude = 0
        velocity = 0
        flightState = 'LANDED'
      }
      break

    case 'LANDED':
      altitude = 0
      velocity = 0
      // Satellite rests on ground, orientation stabilizes
      orientationY = 45.0 // resting on side
      orientationZ = 12.0
      break
  }

  // Barometric formula: P = P0 * exp(-h / 8400)
  pressure = referencePressure * Math.exp(-altitude / 8400.0) + (Math.random() * 0.08 - 0.04)

  return {
    p: packetCounter,
    pr: Number(pressure.toFixed(2)),
    a: Number(altitude.toFixed(2)),
    v: Number(velocity.toFixed(2)),
    x: Number(orientationX.toFixed(2)),
    y: Number(orientationY.toFixed(2)),
    z: Number(orientationZ.toFixed(2)),
    bv: Number(batteryVoltage.toFixed(3)),
    state: flightState,
    parachute: parachuteDeployed
  }
}

function getSimulatorStatus() {
  return {
    bmp: true,
    bno: true,
    ina: true,
    ref: Number(referencePressure.toFixed(2)),
    flightState,
    parachuteDeployed
  }
}

module.exports = {
  stepSimulator,
  resetSimulator,
  calibrateSimulator,
  launchSimulator,
  startFlightSimulation,
  ejectSimulator,
  getSimulatorStatus
}
