# LIFT-OS • Centralized Dispatch & Automated SMS Framework

A sleek, high-fidelity web application implementing the architectural logic for a solo-manager lift maintenance operation. Designed with the **"Minimum Clicks"** philosophy, it eliminates manual data entry through intelligent auto-fill triage, real-time geospatial field tech routing, and an automated two-way SMS communication matrix.

---

## 🚀 Instant Deployment on Render.com

This project is pre-configured and ready to deploy on **[Render.com](https://render.com)** as a Web Service.

1. Connect this repository on Render Dashboard.
2. Select **Node** environment.
3. Configure settings:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start` (or `node server.js`)
4. Click **Deploy Web Service**! The app will start and serve both the API backend and the complete interactive dashboard.

---

## 💻 Running Locally

You can run the application locally in two ways:

### Option A: Using Node.js Server (Recommended for Full API Sync)
```bash
npm install
npm start
```
Open `http://localhost:3000` in your web browser.

### Option B: Standalone Zero-Config Mode
Simply double-click `index.html` or open it directly in your web browser (`file:///.../index.html`). The application engine will automatically fallback to local browser memory and execute with 100% functionality.

---

## 🏛️ Core Architectural Features

### 1. Single-Screen Dispatch Dashboard (Three Unified Zones)
- **Zone 1: Rapid Intake & Triage:** Master search bar where entering a phone number (or choosing a quick demo caller) instantly auto-fills the client profile, lift location, ownership type (`Internal` vs `3rd-Party`), and active contract tier. Selecting the issue type auto-assigns the exact priority (`P1 Emergency` to `P4 Standard`).
- **Zone 2: Live Electrician Geospatial Map:** Interactive city grid visualizing lift assets as pins and field electricians as real-time status dots (`Green = Free`, `Yellow = On Job`, `Red = Off Duty`). Automatically computes driving distance and ETA to the active lift.
- **Zone 3: Active Queue:** Dynamic ticket queue strictly sorted by SLA urgency (`P1 Passenger Trapped` forcefully pinned to the top with pulsing red visual warnings and live SLA countdown timers).

### 2. Automated Two-Way SMS Gateway Simulator
- **Consumer Phone Screen:** Simulates instant SMS confirmations with live ETA calculation when a technician is dispatched, preventing anxious follow-up calls.
- **Electrician Phone Screen:** Displays the single offline-friendly operational brief containing address, lift brand/schematics, gate codes, and exact issue notes.
- **Step 6: Remote Resolution & Dynamic Billing:** The field tech selects parts consumed from the database inventory and sends `DONE [Ticket_ID]`. For external **3rd-Party contracts**, the system automatically calculates parts & labor and triggers a dynamic billing modal for immediate invoicing.

### 3. Cellular Dead Zone Protection (Offline Caching)
- Lift motor rooms and concrete shafts frequently lack cellular reception.
- Toggle the **"Cellular Signal State"** button on the Electrician console to simulate a dead zone (`Offline`).
- When the tech attempts to text `DONE [Ticket_ID]` while offline, the system safely buffers the payload in device local storage.
- Once the technician exits the building and toggles the signal back to **Connected (`Online`)**, the cached SMS is automatically transmitted, resolving the ticket and sending confirmation to the client.

### 4. Core Relational Database Inspector
- Live tabbed view inspecting the five relational tables (`Clients`, `Lifts`, `Electricians`, `Tickets`, `Parts_Inventory`).
- Watch stock levels deduct automatically in real-time when parts are logged during ticket resolution.
