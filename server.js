const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const DB_FILE_PATH = process.env.DB_FILE_PATH || path.join(__dirname, 'db.json');

// Initial seed data configuration template (Pakistani Context)
const INITIAL_SEED_DB = {
  Clients: [
    { Client_ID: "C-101", Name: "HBL Tower (HQ)", Phone_Number: "+923034130621", Billing_Address: "I.I. Chundrigar Road, Karachi" },
    { Client_ID: "C-102", Name: "Centaurus Mall", Phone_Number: "+923034130621", Billing_Address: "Jinnah Avenue, Sector F-8, Islamabad" },
    { Client_ID: "C-103", Name: "Packages Mall", Phone_Number: "+923034130621", Billing_Address: "Walton Road, Lahore" },
    { Client_ID: "C-104", Name: "Giga Mall", Phone_Number: "+923034130621", Billing_Address: "DHA Phase 2, GT Road, Rawalpindi" }
  ],
  Lifts: [
    { Lift_ID: "L-201", Client_ID: "C-101", Ownership_Type: "Internal", Brand: "Otis Gen2", Address: "HBL Tower Karachi - Shaft A", SLA_Tier: "P2", x: 140, y: 80 },
    { Lift_ID: "L-202", Client_ID: "C-102", Ownership_Type: "3rd-Party", Brand: "Schindler 3300", Address: "Centaurus Mall Islamabad - Atrium 2", SLA_Tier: "P1", x: 480, y: 130 },
    { Lift_ID: "L-203", Client_ID: "C-103", Ownership_Type: "3rd-Party", Brand: "Kone MonoSpace", Address: "Packages Mall Lahore - Main Entrance", SLA_Tier: "P1", x: 380, y: 250 },
    { Lift_ID: "L-204", Client_ID: "C-104", Ownership_Type: "Internal", Brand: "Thyssenkrupp Synergy", Address: "Giga Mall Rawalpindi - South Tower", SLA_Tier: "P3", x: 210, y: 230 }
  ],
  Electricians: [
    { Electrician_ID: "E-301", Name: "Muhammad Ali", Phone: "+923034130621", Status: "Free", GPS: { x: 180, y: 220, lat: 24.8607, lng: 67.0011 } },
    { Electrician_ID: "E-302", Name: "Usman Ahmed", Phone: "+923034130621", Status: "Free", GPS: { x: 520, y: 150, lat: 33.6844, lng: 73.0479 } },
    { Electrician_ID: "E-303", Name: "Zainab Bibi", Phone: "+923034130621", Status: "On Job", GPS: { x: 310, y: 410, lat: 31.5204, lng: 74.3587 } },
    { Electrician_ID: "E-304", Name: "Muhammad Bilal", Phone: "+923034130621", Status: "Off Duty", GPS: { x: 110, y: 490, lat: 33.5651, lng: 73.0169 } }
  ],
  Tickets: [
    {
      Ticket_ID: "TKT-8901",
      Lift_ID: "L-203",
      Electrician_ID: "E-303",
      Priority: "P1",
      Status: "Dispatched",
      Notes: "Passenger trapped between ground & 1st floor. Alarm ringing.",
      Created_At: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
      SLA_Deadline: new Date(Date.now() + 3 * 60 * 1000).toISOString(),
      Parts_Used: []
    }
  ],
  Parts_Inventory: [
    { Part_ID: "PRT-401", Name: "Universal Control Board", Stock_Count: 14, Price: 135000.00 },
    { Part_ID: "PRT-402", Name: "Optical Door Sensor Unit", Stock_Count: 28, Price: 26000.00 },
    { Part_ID: "PRT-403", Name: "Traction Steel Cable (10m)", Stock_Count: 6, Price: 180000.00 },
    { Part_ID: "PRT-404", Name: "Hydraulic Valve Pack", Stock_Count: 11, Price: 86000.00 },
    { Part_ID: "PRT-405", Name: "Emergency Intercom Battery", Stock_Count: 45, Price: 12000.00 }
  ]
};

// Core Relational Database (Simulated persistence for Render.com & Local)
let db = JSON.parse(JSON.stringify(INITIAL_SEED_DB));

// Database persistence read/write managers
function loadDatabase() {
  try {
    const fs = require('fs');
    if (fs.existsSync(DB_FILE_PATH)) {
      const fileData = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      db = JSON.parse(fileData);
      console.log(`💾 Relational database successfully loaded from: ${DB_FILE_PATH}`);
    } else {
      console.log(`💾 Database file not found. Bootstrapping with default demo seed data...`);
      saveDatabase();
    }
  } catch (err) {
    console.error("❌ Failed to read database from file. Falling back to memory state:", err.message);
  }
}

function saveDatabase() {
  try {
    const fs = require('fs');
    const dir = path.dirname(DB_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(db, null, 2), 'utf-8');
    console.log(`💾 Relational database state persisted to: ${DB_FILE_PATH}`);
  } catch (err) {
    console.error("❌ Failed to save database to disk:", err.message);
  }
}

// Bootstrap state on launch
loadDatabase();

// API Endpoints
app.get('/api/state', (req, res) => {
  res.json({ success: true, db });
});

app.post('/api/tickets/create', (req, res) => {
  const { Lift_ID, Priority, Notes } = req.body;
  const lift = db.Lifts.find(l => l.Lift_ID === Lift_ID);
  if (!lift) return res.status(404).json({ error: "Lift not found" });

  const Ticket_ID = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;
  let slaMinutes = Priority === 'P1' ? 15 : Priority === 'P2' ? 30 : Priority === 'P3' ? 240 : 1440;
  const SLA_Deadline = new Date(Date.now() + slaMinutes * 60 * 1000).toISOString();

  const ticket = {
    Ticket_ID,
    Lift_ID,
    Electrician_ID: null,
    Priority,
    Status: "Open",
    Notes: Notes || "Reported via Rapid Intake",
    Created_At: new Date().toISOString(),
    SLA_Deadline,
    Parts_Used: []
  };

  db.Tickets.unshift(ticket);
  saveDatabase();
  res.json({ success: true, ticket, db });
});

app.post('/api/tickets/dispatch', (req, res) => {
  const { Ticket_ID, Electrician_ID } = req.body;
  const ticket = db.Tickets.find(t => t.Ticket_ID === Ticket_ID);
  const electrician = db.Electricians.find(e => e.Electrician_ID === Electrician_ID);

  if (!ticket || !electrician) {
    return res.status(404).json({ error: "Ticket or Electrician not found" });
  }

  ticket.Electrician_ID = Electrician_ID;
  ticket.Status = "Dispatched";
  electrician.Status = "On Job";

  saveDatabase();
  res.json({ success: true, ticket, electrician, db });
});

app.post('/api/tickets/resolve', (req, res) => {
  const { Ticket_ID, Parts_Used, Resolution_Notes } = req.body;
  const ticket = db.Tickets.find(t => t.Ticket_ID === Ticket_ID);
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });

  ticket.Status = "Closed";
  if (Resolution_Notes) ticket.Notes += ` [Resolved: ${Resolution_Notes}]`;

  // Deduct inventory if parts were used
  if (Parts_Used && Array.isArray(Parts_Used)) {
    ticket.Parts_Used = Parts_Used;
    Parts_Used.forEach(partItem => {
      const invPart = db.Parts_Inventory.find(p => p.Part_ID === partItem.Part_ID);
      if (invPart && invPart.Stock_Count >= partItem.Quantity) {
        invPart.Stock_Count -= partItem.Quantity;
      }
    });
  }

  // Free up electrician
  if (ticket.Electrician_ID) {
    const electrician = db.Electricians.find(e => e.Electrician_ID === ticket.Electrician_ID);
    if (electrician) electrician.Status = "Free";
  }

  const lift = db.Lifts.find(l => l.Lift_ID === ticket.Lift_ID);
  const client = lift ? db.Clients.find(c => c.Client_ID === lift.Client_ID) : null;

  saveDatabase();
  res.json({ success: true, ticket, db, lift, client });
});

// Simple custom .env file parser for local zero-dependency config loading
try {
  const fs = require('fs');
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envLines = fs.readFileSync(envPath, 'utf-8').split('\n');
    envLines.forEach(line => {
      const match = line.match(/^\s*([\w\.\-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = match[2] || '';
        if (val.length > 0 && val.charAt(0) === '"' && val.charAt(val.length - 1) === '"') {
          val = val.substring(1, val.length - 1);
        }
        process.env[key] = val;
      }
    });
  }
} catch (e) {
  console.error("Note: Unable to load local .env config", e.message);
}

// Secure Veevotech SMS API Proxy
app.post('/api/sms/send', async (req, res) => {
  const { receivernum, textmessage } = req.body;
  if (!receivernum || !textmessage) {
    return res.status(400).json({ success: false, error: "Missing receivernum or textmessage" });
  }

  // Sanitize phone number (strip spaces, dashes, parentheses)
  const cleanNumber = receivernum.replace(/[\s\-\(\)]/g, '');
  const hash = process.env.VEEVOTECH_HASH || "34dca807396164898ffc2e1e8571992c";
  const sendernum = process.env.VEEVOTECH_SENDERNUM || "Default";

  console.log(`📡 Forwarding SMS request to Veevotech API for recipient: ${cleanNumber}`);

  try {
    const response = await fetch('https://api.veevotech.com/v3/sendsms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        hash: hash,
        receivernum: cleanNumber,
        sendernum: sendernum,
        textmessage: textmessage
      })
    });

    let resBody;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      resBody = await response.json();
    } else {
      resBody = await response.text();
    }

    console.log(`📡 Veevotech Response received:`, resBody);
    res.json({ success: true, apiResponse: resBody });
  } catch (error) {
    console.error(`❌ Failed to send SMS via Veevotech:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/clients/create', (req, res) => {
  const { Name, Phone_Number, Billing_Address, Brand, Address, Ownership_Type, SLA_Tier } = req.body;
  if (!Name || !Phone_Number) {
    return res.status(400).json({ error: "Missing Name or Phone Number" });
  }

  const Client_ID = `C-${Math.floor(100 + Math.random() * 900)}`;
  const Lift_ID = `L-${Math.floor(200 + Math.random() * 800)}`;

  const clientObj = { Client_ID, Name, Phone_Number, Billing_Address: Billing_Address || Address };
  const liftObj = {
    Lift_ID,
    Client_ID,
    Ownership_Type: Ownership_Type || "3rd-Party",
    Brand: Brand || "Custom Lift",
    Address: Address || Billing_Address,
    SLA_Tier: SLA_Tier || "P2",
    x: Math.floor(50 + Math.random() * 550),
    y: Math.floor(50 + Math.random() * 220)
  };

  db.Clients.push(clientObj);
  db.Lifts.push(liftObj);
  saveDatabase();

  res.json({ success: true, client: clientObj, lift: liftObj, db });
});

app.post('/api/electricians/create', (req, res) => {
  const { Name, Phone, Status } = req.body;
  if (!Name || !Phone) {
    return res.status(400).json({ error: "Missing Name or Phone" });
  }

  const Electrician_ID = `E-${Math.floor(300 + Math.random() * 700)}`;
  const electricianObj = {
    Electrician_ID,
    Name,
    Phone,
    Status: Status || "Free",
    GPS: {
      x: Math.floor(50 + Math.random() * 550),
      y: Math.floor(50 + Math.random() * 220),
      lat: 30.0 + Math.random() * 4,
      lng: 70.0 + Math.random() * 4
    }
  };

  db.Electricians.push(electricianObj);
  saveDatabase();

  res.json({ success: true, electrician: electricianObj, db });
});

app.post('/api/reset', (req, res) => {
  const fs = require('fs');
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      fs.unlinkSync(DB_FILE_PATH);
    }
  } catch (e) {}
  db = JSON.parse(JSON.stringify(INITIAL_SEED_DB));
  saveDatabase();
  res.json({ success: true, message: "Database reset to initial state", db });
});

app.listen(PORT, () => {
  console.log(`🚀 Lift Maintenance Central Dispatch Server running on port ${PORT}`);
  console.log(`🌐 Ready for Render.com deployment and local usage.`);
});
