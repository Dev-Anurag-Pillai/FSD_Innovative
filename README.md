# 🛰️ CanSat Ground Control & Real-Time Telemetry Mission Station

> **Dual-Disciplinary Engineering Innovation Project**  
> **Courses**: Microprocessor & Interfacing (MI) & Full Stack Web Development (FSD)  
> **Author**: Anurag Pillai — Nirma University, Semester 5  
> **Repository**: [Dev-Anurag-Pillai/FSD_Innovative](https://github.com/Dev-Anurag-Pillai/FSD_Innovative)  
> **Active Branch**: `database-connection`

---

## 📑 Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [End-to-End System Architecture & Dataflow](#2-end-to-end-system-architecture--dataflow)
3. [Technology Stack](#3-technology-stack)
4. [Hardware & Microcontroller Layer (MI)](#4-hardware--microcontroller-layer-mi)
5. [Backend & Database Layer (FSD)](#5-backend--database-layer-fsd)
6. [Frontend & 3D Visualization Layer (FSD)](#6-frontend--3d-visualization-layer-fsd)
7. [Key Files & Codebase Directory Map](#7-key-files--codebase-directory-map)
8. [Telemetry Wire Protocol & Database Schemas](#8-telemetry-wire-protocol--database-schemas)
9. [Deployment & Tunneling Architecture](#9-deployment--tunneling-architecture)
10. [Local & Cloud Execution Guide](#10-local--cloud-execution-guide)
11. [Evaluator & Viva Preparation Cheat Sheet](#11-evaluator--viva-preparation-cheat-sheet)

---

## 1. Executive Summary

This project is a mission-grade **CanSat Ground Control Station (GCS)** and **Real-Time Telemetry Processing System**. A CanSat is an operational simulation of an orbital satellite integrated into the volume and shape of a standard 330ml soda can. 

During descent, the CanSat reads environmental atmospheric pressure, altitude, 3-axis orientation (roll, pitch, yaw), descent velocity, and onboard lithium battery health. The payload streams this telemetry at **16 Hz (every 62.5 ms)** over an embedded Wi-Fi HTTP REST interface, logs to onboard micro-SD flash memory via high-speed UART, and broadcasts to a full-stack ground station web platform.

The ground station provides:
- **Interactive 3D Attitude Synchronization**: Live Euler angle rotation of the physical CanSat STL model powered by **Three.js**.
- **High-Frequency Dynamic Telemetry HUD**: 16 Hz real-time graph visualization (Altitude, Atmospheric Pressure, Descent Velocity, Battery Voltage) built with **Recharts**.
- **Persistent Flight Logging**: Remote cloud persistence into **MongoDB Atlas / Compass** with batch buffering, session duration metrics, and CSV/JSON export.
- **Dynamic Ingress & Watchdog Protection**: Zero-restart dynamic ESP32/ngrok IP switching and an automatic 10-second packet inactivity watchdog with industrial metallic red (disconnected) and green (connected) UI states.

---

## 2. End-to-End System Architecture & Dataflow

The system spans 5 interconnected layers: Physical Sensors $\to$ Edge Embedded Microcontroller $\to$ Network Ingress / Tunnel $\to$ Node.js/Express Middleware $\to$ React 18 Browser Client & MongoDB Atlas.

### Comprehensive System Dataflow Diagram

```mermaid
flowchart TD
    subgraph PhysicalSensors ["1. Physical Sensors (Payload)"]
        BMP["BMP390 Sensor<br/>(Barometric Pressure & Altitude)"]
        BNO["BNO055 9-DOF IMU<br/>(Roll, Pitch, Yaw Orientation)"]
        INA["INA219 Power Monitor<br/>(Bus Voltage & Current)"]
    end

    subgraph MCU ["2. Edge Embedded Controller (ESP32-S3)"]
        I2C["Hardware I2C Bus<br/>SDA=GPIO 1, SCL=GPIO 2<br/>@ 400 kHz Fast-Mode"]
        CORE["Dual-Core Xtensa LX7 @ 240MHz<br/>Sampling Loop: 16 Hz (62,500 µs)"]
        NEO["WS2812B NeoPixel LED<br/>GPIO 21 (Hardware Diagnostics)"]
        UART["Hardware UART1<br/>RX=13, TX=5 @ 115200 baud<br/>OpenLog SD Card (2 Hz CSV)"]
        SERVER["Embedded WebServer(80)<br/>Endpoint: /api/live, /api/status<br/>CORS Enabled"]
    end

    BMP -->|I2C 0x77| I2C
    BNO -->|I2C 0x28| I2C
    INA -->|I2C 0x40| I2C
    I2C --> CORE
    CORE --> NEO
    CORE --> UART
    CORE --> SERVER

    subgraph Network ["3. Network & Ingress Layer"]
        WIFI["Wi-Fi 802.11 b/g/n<br/>SSID: ESPTest (Local Subnet 10.25.68.x)"]
        NGROK["ngrok Secure Reverse Tunnel<br/>https://alright-spoiler-embargo.ngrok-free.dev"]
    end

    SERVER --> WIFI
    WIFI -->|Port 80 LAN| NGROK

    subgraph Backend ["4. Ground Station Middleware (Node.js & Express)"]
        EXPRESS["Express.js Server (:3001)<br/>frontend/server/index.cjs"]
        WATCHDOG["10-Second Watchdog<br/>In-flight Polling Guard & Grace Period"]
        SESS["Session Manager<br/>frontend/server/sessionManager.cjs"]
        BUFFER["Telemetry Batch Buffer<br/>Flushes every 20 packets / 1s"]
        MONGO_DRV["Mongoose ORM<br/>frontend/server/db.cjs"]
    end

    WIFI -.->|Direct LAN Route| EXPRESS
    NGROK -->|Internet Route (Render Deployment)| EXPRESS
    EXPRESS --> WATCHDOG
    EXPRESS --> SESS
    SESS --> BUFFER
    BUFFER --> MONGO_DRV

    subgraph Database ["5. Database & Cloud Storage"]
        ATLAS[("MongoDB Atlas Cloud / Local<br/>DB: cansat_telemetry<br/>Collections: telemetries, sessions")]
        FS["Local Disk Filesystem<br/>data/sessions/*.json & *.csv"]
    end

    MONGO_DRV --> ATLAS
    SESS --> FS

    subgraph Frontend ["6. Ground Station Dashboard (React 18 & Vite)"]
        NAVBAR["Industrial Navbar<br/>Manual Start/Stop Telemetry<br/>Dynamic IP Input (Set)<br/>Start/Stop Recording Toggle<br/>Metallic Status Badges"]
        THREE["CanSatViewer (Three.js / WebGL)<br/>3D STL Model Rotation (Roll, Pitch, Yaw)"]
        GRAPHS["TelemetryGraphs (Recharts)<br/>Altitude, Pressure, Velocity, Voltage Curves"]
        HUD["Monochrome Metric HUD<br/>Live Numerical Cards @ 16 Hz"]
        MODAL["Session Manager Modal<br/>Historic Flights Replay & Export"]
    end

    EXPRESS -->|JSON REST Stream: /api/live| NAVBAR
    NAVBAR --> HUD
    HUD --> THREE
    HUD --> GRAPHS
    EXPRESS -->|Historic Replay: /api/sessions| MODAL
```

---

## 3. Technology Stack

| Layer | Technology | Version / Spec | Purpose & Usage in Project |
|---|---|---|---|
| **MCU Hardware** | Waveshare ESP32-S3-Zero | Xtensa 32-bit LX7 @ 240 MHz | Main flight computer, sensor acquisition, and HTTP REST server |
| **Environmental** | Adafruit BMP390 | I2C (`0x77`), 3.3V | Barometric pressure (hPa), altitude calculation (hypsometric formula), ambient temp |
| **IMU / Fusion** | Bosch BNO055 | I2C (`0x28`), 3.3V | 9-DOF absolute orientation sensor with onboard ARM Cortex M0 sensor fusion |
| **Power Sensor** | Adafruit INA219 | I2C (`0x40`), 3.3V | High-side DC bus voltage (0–26V) and current draw monitoring |
| **Storage / Blackbox** | SparkFun OpenLog | UART1 @ 115200 baud | Micro-SD card CSV logging at 2 Hz for hardware blackbox recovery |
| **Local Status** | WS2812B NeoPixel | GPIO 21, Single RGB | Visual hardware diagnostics (Boot, Calibrating, Wi-Fi Ready, Error) |
| **Backend Framework**| Node.js & Express.js | Express 4.x, CommonJS | Reverse proxy, static file server, hardware polling loop, and API routing |
| **Database / ODM** | MongoDB Atlas & Mongoose | Mongoose 8.x | Document database for persistent session indexing and telemetry batch logging |
| **GUI Framework** | React.js | React 18, Vite | Component-driven single-page application (SPA) with hooks |
| **Styling** | Vanilla CSS & TailwindCSS | Grayscale Industrial | Custom dark metallic aesthetic with dynamic emerald and crimson accents |
| **3D Rendering** | Three.js & `@react-three/fiber` | Three r128+, STLLoader | Real-time WebGL rendering of the physical 3D CanSat container |
| **Data Visualization**| Recharts | Recharts 2.x | Real-time multi-axis time-series telemetry charting at 16 Hz |
| **Tunneling / Cloud** | ngrok & Render | Cloud PaaS & TCP Tunnel | Transatlantic internet bridge between remote cloud server and local WiFi ESP32 |

---

## 4. Hardware & Microcontroller Layer (MI)

### Hardware Pin Mapping

```
ESP32-S3-Zero Pinout:
┌────────────────────────────────────────┐
│  GPIO 1   ──────► I2C SDA (Sensors)    │
│  GPIO 2   ──────► I2C SCL (Sensors)    │
│  GPIO 5   ──────► UART1 TX (OpenLog RX)│
│  GPIO 13  ──────► UART1 RX (OpenLog TX)│
│  GPIO 21  ──────► NeoPixel RGB Data    │
│  3V3      ──────► Sensor VCC (3.3V)    │
│  GND      ──────► Common Ground        │
└────────────────────────────────────────┘
```

### Microcontroller Execution Cycle (`setup()` & `loop()`)
1. **Boot & Peripheral Setup (`setup`)**:
   - Initializes Serial debug console at `115200 baud`.
   - Wires I2C bus on GPIO 1 (SDA) and GPIO 2 (SCL) at `400 kHz Fast-Mode`.
   - Probes BMP390, BNO055, and INA219. Sets status flags.
   - Connects to Wi-Fi station (`WIFI_SSID = "ESPTest"`) using static or DHCP IP.
   - Mounts HTTP routes on `WebServer server(80)`: `/api/live`, `/api/status`, `/api/reset`, `/api/calibrate`.
2. **Deterministic Sample Loop (`loop`)**:
   - Uses non-blocking microsecond timing `micros() - lastSensorReadTime >= 62500UL` to ensure exact **16.0 Hz execution**.
   - Calculates relative altitude using the hypsometric formula:
     $$\text{Altitude} = 44330.0 \times \left(1.0 - \left(\frac{P}{P_{\text{ref}}}\right)^{0.1903}\right)$$
   - Computes descent velocity as $\Delta \text{Altitude} / \Delta t$.
   - Extracts Euler angles (Roll $X$, Pitch $Y$, Yaw $Z$) from BNO055 quaternion fusion.
   - Every 8th packet (2 Hz), formats and writes a CSV row to the OpenLog SD card.
   - Calls `server.handleClient()` to serve incoming ground station requests immediately.

---

## 5. Backend & Database Layer (FSD)

The backend acts as an intelligent middleware bridge situated between the physical CanSat and the browser dashboard.

### Core Backend Responsibilities (`frontend/server/index.cjs`)
1. **High-Frequency Asynchronous Poller**:
   - Executes an interval every 62 ms (16 Hz) to fetch latest data from `${esp32Url}/api/live`.
   - **In-Flight Polling Guard (`isPollingInFlight`)**: Prevents overlapping TCP requests when operating over high-latency transatlantic tunnels (ngrok).
   - **Dynamic Timeout Switch**: Enforces an 800 ms timeout for LAN connections and a 3500 ms timeout for remote ngrok tunnels.
2. **10-Second Watchdog & Grace Period**:
   - Embedded sensors in flight may occasionally suffer dropped Wi-Fi packets.
   - The backend tracks `lastPacketTime`. It **only flips `isHardwareReachable` to `false` if 10 consecutive seconds elapse without receiving a single valid packet**.
3. **Dynamic IP Configuration**:
   - Exposes `POST /api/ip` and `GET /api/ip`. The operator can change the target ESP32 IP or ngrok tunnel URL from the frontend UI at runtime without restarting the Node.js server.
4. **Recording & Session Management (`sessionManager.cjs`)**:
   - When the operator clicks **"Start Recording"**, the backend creates a unique mission session (`sessionId = session_<timestamp>`), initializes `.json` and `.csv` files on disk, and creates a document in MongoDB Atlas.
   - Collects incoming telemetry into an in-memory buffer (`BATCH_SIZE = 20` or `FLUSH_INTERVAL = 1000ms`), then performs high-efficiency bulk insertions via `Telemetry.insertMany(batch)`.
5. **Static Production Hosting**:
   - In production (Render cloud), serves the built React frontend (`frontend/dist`) via `express.static()` and handles client-side routing via a wildcard fallback (`app.get('*')`).

---

## 6. Frontend & 3D Visualization Layer (FSD)

The frontend is a single-page application built with React 18, tailored to an industrial mission control aesthetic.

### Frontend Components & Responsibilities
- **[App.jsx](file:///d:/One%20Drive/OneDrive%20-%20nirmauni.ac.in/Nirma%20University/Semester%205/Innovative%20Assignment/MI_FSD/frontend/src/App.jsx)**:
  - Central orchestrator maintaining state for telemetry, connection status, manual polling control (`isReceivingTelemetry`), recording status (`isRecording`), and 10-second client-side disconnect watchdog.
- **[Navbar.jsx](file:///d:/One%20Drive/OneDrive%20-%20nirmauni.ac.in/Nirma%20University/Semester%205/Innovative%20Assignment/MI_FSD/frontend/src/components/Navbar.jsx)**:
  - **Dynamic Target Input**: Runtime text box to set target ESP32 IP or ngrok tunnel URL.
  - **Manual Telemetry Control**: Operator-controlled **"START TELEMETRY"** / **"STOP TELEMETRY"** toggle to eliminate unwanted network overhead.
  - **Start/Stop Recording**: Activates cloud database recording.
  - **Status Indicator**: High-visibility metallic badge (`CONNECTED` in metallic emerald green vs `DISCONNECTED` in metallic crimson red).
- **[CanSatViewer.jsx](file:///d:/One%20Drive/OneDrive%20-%20nirmauni.ac.in/Nirma%20University/Semester%205/Innovative%20Assignment/MI_FSD/frontend/src/components/CanSatViewer.jsx)**:
  - Loads the physical `cansat.stl` mesh using `three/examples/jsm/loaders/STLLoader`.
  - Maps orientation angles $X, Y, Z$ to 3D Euler rotations in real-time, matching physical flight attitude.
- **[TelemetryGraphs.jsx](file:///d:/One%20Drive/OneDrive%20-%20nirmauni.ac.in/Nirma%20University/Semester%205/Innovative%20Assignment/MI_FSD/frontend/src/components/TelemetryGraphs.jsx)**:
  - 4 synchronized Recharts time-series graphs: Altitude (m), Pressure (hPa), Velocity (m/s), and Battery Voltage (V).
  - Maintains a sliding window buffer of the most recent 30 data points.
- **[CommandCenter.jsx](file:///d:/One%20Drive/OneDrive%20-%20nirmauni.ac.in/Nirma%20University/Semester%205/Innovative%20Assignment/MI_FSD/frontend/src/components/CommandCenter.jsx)**:
  - Ground uplink commands: Calibrate Ground Reference, Reset Packet Counter, and simulate Parachute Ejection.
- **[SessionManagerModal.jsx](file:///d:/One%20Drive/OneDrive%20-%20nirmauni.ac.in/Nirma%20University/Semester%205/Innovative%20Assignment/MI_FSD/frontend/src/components/SessionManagerModal.jsx)**:
  - Flight session history browser: review past flights, replay telemetry packets, and download CSV/JSON flight logs.

---

## 7. Key Files & Codebase Directory Map

```
MI_FSD/
├── README.md                                   # Master project & viva evaluation documentation
├── Guide.md                                    # Deep-dive Microprocessor & Interfacing viva study guide
├── cansat.stl                                  # 3D CAD model of CanSat structure for Three.js
├── package.json                                # Root npm scripts for building & starting the project
│
├── ESP32-S3-Zero Codes/                        # Embedded C++ Firmware
│   └── 16Hz-api-reset-caliberate/
│       └── 16Hz-api-reset-caliberate.ino       # Active firmware: I2C acquisition, WebServer, 16Hz API
│
└── frontend/                                   # Full Stack Web Ground Station
    ├── package.json                            # Frontend and backend dependencies
    ├── vite.config.js                          # Vite build tool configuration & proxy
    │
    ├── server/                                 # Node.js / Express Backend
    │   ├── index.cjs                           # Main backend server, 16Hz poller, watchdog, REST API
    │   ├── db.cjs                              # MongoDB Atlas connection manager & error recovery
    │   ├── sessionManager.cjs                  # Flight recording manager (disk + MongoDB batch flusher)
    │   ├── simulator.cjs                       # Physics simulation engine for offline demonstration
    │   └── models/                             # Mongoose Schemas
    │       ├── Telemetry.cjs                   # Schema for individual telemetry data points
    │       └── Session.cjs                     # Schema for mission flight sessions & summaries
    │
    └── src/                                    # React 18 User Interface
        ├── main.jsx                            # React application entry point
        ├── App.jsx                             # Primary mission dashboard & state manager
        ├── index.css                           # Industrial monochrome & metallic accent styles
        └── components/
            ├── Navbar.jsx                      # Mission control header, IP input, telemetry & record switches
            ├── CanSatViewer.jsx                # Three.js 3D satellite orientation visualizer
            ├── TelemetryGraphs.jsx             # Real-time Recharts sensor time-series curves
            ├── CommandCenter.jsx               # Ground station command uplink triggers
            └── SessionManagerModal.jsx         # Historic mission replay & data export modal
```

---

## 8. Telemetry Wire Protocol & Database Schemas

### 1. Embedded JSON Wire Protocol (`GET /api/live`)
To maximize Wi-Fi throughput and minimize serialization overhead on the ESP32 Xtensa core, telemetry is transmitted as a minified JSON object:

```json
{
  "p": 3197,
  "pr": 1007.40,
  "a": 0.92,
  "v": 0.90,
  "x": -96.69,
  "y": -0.62,
  "z": 90.81,
  "bv": 11.404
}
```

| Key | Full Name | Unit | Source Sensor | Description |
|---|---|---|---|---|
| `p` | `packet` | Count | ESP32 Counter | Monotonically increasing packet sequence ID |
| `pr` | `pressure` | hPa | BMP390 | Atmospheric barometric pressure |
| `a` | `altitude` | m | BMP390 | Altitude relative to ground reference |
| `v` | `velocity` | m/s | Calculated | Descent rate ($-\text{descent}$, $+\text{ascent}$) |
| `x` | `orientationX` | Degrees | BNO055 | Roll angle ($\pm 180^\circ$) |
| `y` | `orientationY` | Degrees | BNO055 | Pitch angle ($\pm 90^\circ$) |
| `z` | `orientationZ` | Degrees | BNO055 | Yaw / Heading angle ($0^\circ - 360^\circ$) |
| `bv` | `batteryVoltage`| Volts | INA219 | Onboard Lithium Polymer bus voltage |

---

### 2. MongoDB Mongoose Schemas

#### A. Telemetry Point Schema (`telemetries` collection)
```javascript
const TelemetrySchema = new mongoose.Schema({
  sessionId:      { type: String, required: true, index: true },
  packet:         { type: Number, required: true, index: true },
  pressure:       { type: Number, required: true },
  altitude:       { type: Number, required: true },
  velocity:       { type: Number, required: true },
  orientationX:   { type: Number, required: true },
  orientationY:   { type: Number, required: true },
  orientationZ:   { type: Number, required: true },
  batteryVoltage: { type: Number, required: true },
  timestamp:      { type: Date, default: Date.now, index: true }
});

TelemetrySchema.index({ sessionId: 1, packet: 1 });
```

#### B. Flight Session Schema (`sessions` collection)
```javascript
const SessionSchema = new mongoose.Schema({
  sessionId:       { type: String, required: true, unique: true, index: true },
  title:           { type: String, default: 'Mission Flight Session' },
  startTime:       { type: Date, default: Date.now, index: true },
  endTime:         { type: Date },
  durationSeconds: { type: Number, default: 0 },
  status:          { type: String, enum: ['active', 'completed', 'aborted'] },
  jsonFileName:    { type: String, required: true },
  csvFileName:     { type: String, required: true },
  packetCount:     { type: Number, default: 0 },
  stats: {
    maxAltitude:       { type: Number, default: 0 },
    minAltitude:       { type: Number, default: 0 },
    maxVelocity:       { type: Number, default: 0 },
    minVelocity:       { type: Number, default: 0 },
    avgPressure:       { type: Number, default: 0 },
    minBatteryVoltage: { type: Number, default: 0 },
    maxBatteryVoltage: { type: Number, default: 0 }
  },
  source:          { type: String, enum: ['esp32_hardware', 'flight_simulator'] }
});
```

---

## 9. Deployment & Tunneling Architecture

Because the project is designed for both local field testing and remote cloud evaluation, two network topologies are supported:

```
[SCENARIO A: Local LAN Field Testing]
ESP32 (10.25.68.244:80) ◄───── Wi-Fi ─────► Laptop Express Server (:3001) ◄─────► Browser Dashboard

[SCENARIO B: Cloud Production Evaluation (Render + ngrok)]
ESP32 (10.25.68.244:80)
   ▲
   │ (Local Port 80 forward)
ngrok Agent on Laptop ───► ngrok Edge (https://alright-spoiler-embargo.ngrok-free.dev)
                                ▲
                                │ (HTTPS Ingress with 'ngrok-skip-browser-warning')
                      Render Cloud Server (Node.js/Express)
                                ▲
                                │ (HTTPS / React SPA)
                         Client Evaluator Web Browser
```

### Why ngrok is Essential for Cloud Deployment:
The ESP32 is assigned a private, non-routable IP (`10.25.68.244`) by a local mobile hotspot (`ESPTest`). A cloud server running on Render (located in Europe or the US) cannot directly reach a private `10.x.x.x` address. Running `ngrok http 10.25.68.244:80` opens a secure public reverse tunnel, allowing the Render backend to poll the local ESP32 payload seamlessly.

---

## 10. Local & Cloud Execution Guide

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **MongoDB Compass** (for local database visualization) or **MongoDB Atlas** connection string
- **Arduino IDE** (if flashing ESP32-S3 firmware)

---

### 2. Running Locally (LAN Mode)

1. **Power ESP32 & Connect to Wi-Fi**:
   - Turn on the mobile hotspot: SSID `ESPTest`, Password `ESPpassword`.
   - Power the ESP32-S3. Verify its IP via Serial Monitor (e.g., `10.25.68.244`).
2. **Start Backend & Frontend**:
   ```powershell
   cd frontend
   npm install
   npm run dev:all
   ```
   *(This concurrently boots the Express server on port 3001 and Vite dev server on port 5173).*
3. **Open Dashboard**:
   - Navigate to `http://localhost:5173`.
   - In the **"Enter IP:"** field, type `http://10.25.68.244` and click **SET**.
   - Click **START TELEMETRY**.
   - The status badge will flip to **CONNECTED** (metallic green) and graphs will start streaming at 16 Hz.

---

### 3. Deploying to Render & Connecting via ngrok

1. **Start ngrok on the local machine**:
   ```powershell
   ngrok http 10.25.68.244:80
   ```
   Copy the Forwarding URL (e.g., `https://alright-spoiler-embargo.ngrok-free.dev`).
2. **Deploy to Render**:
   - Connect the GitHub repository `Dev-Anurag-Pillai/FSD_Innovative` to Render as a **Web Service**.
   - **Branch**: `database-connection`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment Variables**:
     - `MONGODB_URI`: `mongodb+srv://<username>:<password>@cluster0.mongodb.net/cansat_telemetry?retryWrites=true&w=majority`
     - `ESP32_IP`: `https://alright-spoiler-embargo.ngrok-free.dev`
3. **Operate Ground Station**:
   - Open your deployed Render URL (e.g., `https://fsd-innovative.onrender.com`).
   - If the tunnel URL changes, paste the new URL into **"Enter IP:"** and click **SET**.
   - Click **START TELEMETRY**.

---

### 4. Viewing Data in MongoDB Compass
1. Open MongoDB Compass.
2. Connect to `mongodb://127.0.0.1:27017` (local) or your MongoDB Atlas URI.
3. Open database **`cansat_telemetry`**.
4. In the dashboard, click **"Start Recording"**; let it collect data for 10 seconds, then click **"Stop Recording"**.
5. Refresh MongoDB Compass to inspect the generated documents in:
   - **`telemetries`**: Live sensor points with packet counters and timestamps.
   - **`sessions`**: Summary document containing flight duration, packet count, and peak statistics.

---

## 11. Evaluator & Viva Preparation Cheat Sheet

### Common Full Stack Development (FSD) Questions

#### Q1: Why use an Express backend proxy instead of calling the ESP32 directly from React?
> **Answer**:  
> 1. **Mixed Content Security**: A secure frontend served over HTTPS (Render) cannot make HTTP requests to a local IP (`http://10.25.68.244`) due to browser mixed-content blocking.  
> 2. **CORS Restrictions**: The backend proxy handles cross-origin policies cleanly.  
> 3. **Single-Client ESP32 Protection**: The ESP32 lightweight web server can only handle 1–2 concurrent sockets. The Express backend serves as an intermediary cache, shielding the micro-controller from browser request thrashing.  
> 4. **Persistence & Batching**: The backend continuously writes flight logs to disk and MongoDB without loading down the client browser.

#### Q2: Why choose Polling over WebSockets in this architecture?
> **Answer**:  
> While WebSockets offer persistent full-duplex communication, microcontrollers like the ESP32-S3 incur significant RAM overhead maintaining persistent TCP socket handshakes and ping/pong framing. The HTTP REST endpoint (`/api/live`) is stateless, consumes minimal heap, and the Express backend can poll it at an exact 16 Hz cadence while client browsers consume the data cleanly.

#### Q3: How do you handle network latency when routing through ngrok?
> **Answer**:  
> Local LAN requests respond in under 5 ms, but routing through transatlantic ngrok relays adds 300–500 ms round-trip time. We addressed this with:  
> 1. Increasing the fetch `AbortController` timeout from 800 ms to **3500 ms** for remote/tunnel URLs.  
> 2. Introducing an **`isPollingInFlight` locking guard** so the interval never stacks overlapping network requests.  
> 3. Adding the `'ngrok-skip-browser-warning': 'true'` header to bypass ngrok's free-tier HTML warning page.

#### Q4: Why is there a 10-second watchdog before marking the system disconnected?
> **Answer**:  
> In rocket and drone atmospheric flight, RF Wi-Fi signals occasionally experience packet drops or brief multipath interference. Flipping the UI to "Disconnected" on a single lost packet causes severe flickering and false alarms. We implemented a 10-second grace window on both backend and frontend (`lastPacketReceivedTime`); the system only transitions to disconnected if no packet arrives for a full 10 seconds.

---

### Common Microprocessor & Interfacing (MI) Questions

#### Q1: What communication protocols are used and why?
> **Answer**:  
> - **I2C (Inter-Integrated Circuit)** at 400 kHz: Interconnects the BMP390, BNO055, and INA219. Uses only 2 lines (SDA on GPIO 1, SCL on GPIO 2) with pull-up resistors, supporting multi-device addressing (`0x77`, `0x28`, `0x40`).  
> - **UART (Universal Asynchronous Receiver-Transmitter)** at 115200 baud: Streams telemetry to the OpenLog SD card logger (GPIO 5 TX, GPIO 13 RX). UART is chosen because writing directly to an SD card over SPI can cause unpredictable block-write latency stalls that would disrupt our 16 Hz sampling schedule.  
> - **Wi-Fi 802.11 b/g/n (TCP/IP & HTTP)**: Transmits JSON payloads over port 80 to the ground station.

#### Q2: How is 16 Hz sampling achieved without FreeRTOS task starvation?
> **Answer**:  
> We use non-blocking `micros()` delta timing (`SENSOR_INTERVAL_US = 62500UL`). We never use `delay()` in the main execution loop. Every 62.5 ms, sensor I2C registers are read, the JSON buffer is formatted, and `server.handleClient()` processes pending network packets.

#### Q3: How is relative altitude calculated?
> **Answer**:  
> We use the barometric hypsometric formula based on the International Standard Atmosphere (ISA) model:  
> $$h = 44330 \times \left(1 - \left(\frac{P}{P_0}\right)^{\frac{1}{5.255}}\right)$$  
> During ground initialization (`calibrateSensors()`), the current barometric pressure is latched as the baseline ground reference $P_0$.
