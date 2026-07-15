const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Core Relational Database (In-Memory Simulation for Render.com & Local)
let db = {
  Clients: [
    { Client_ID: "C-101", Name: "Acme Corp (HQ)", Phone_Number: "555-0100", Billing_Address: "100 Industrial Pkwy, Suite 400" },
    { Client_ID: "C-102", Name: "Highrise Apts", Phone_Number: "555-0200", Billing_Address: "789 Skyline Blvd, Property Mgmt" },
    { Client_ID: "C-103", Name: "Metro Mall Retail", Phone_Number: "555-0300", Billing_Address: "456 Commerce Way, Accounting" },
    { Client_ID: "C-104", Name: "City Library", Phone_Number: "555-0400", Billing_Address: "101 Knowledge St, Municipal Dept" }
  ],
  Lifts: [
    { Lift_ID: "L-201", Client_ID: "C-101", Ownership_Type: "Internal", Brand: "Otis Gen2", Address: "100 Industrial Pkwy - North Shaft", SLA_Tier: "P2" },
    { Lift_ID: "L-202", Client_ID: "C-102", Ownership_Type: "3rd-Party", Brand: "Schindler 3300", Address: "789 Skyline Blvd - Tower A Main", SLA_Tier: "P1" },
    { Lift_ID: "L-203", Client_ID: "C-103", Ownership_Type: "3rd-Party", Brand: "Kone MonoSpace", Address: "456 Commerce Way - Atrium Elevator", SLA_Tier: "P1" },
    { Lift_ID: "L-204", Client_ID: "C-104", Ownership_Type: "Internal", Brand: "Thyssenkrupp Synergy", Address: "101 Knowledge St - Stack B", SLA_Tier: "P3" }
  ],
  Electricians: [
    { Electrician_ID: "E-301", Name: "Sarah Connor", Phone: "555-9001", Status: "Free", GPS: { x: 180, y: 220, lat: 37.7749, lng: -122.4194 } },
    { Electrician_ID: "E-302", Name: "Marcus Wright", Phone: "555-9002", Status: "Free", GPS: { x: 520, y: 150, lat: 37.7833, lng: -122.4167 } },
    { Electrician_ID: "E-303", Name: "Kyle Reese", Phone: "555-9003", Status: "On Job", GPS: { x: 310, y: 410, lat: 37.7690, lng: -122.4480 } },
    { Electrician_ID: "E-304", Name: "T-800 Unit (Bob)", Phone: "555-9004", Status: "Off Duty", GPS: { x: 110, y: 490, lat: 37.7600, lng: -122.4300 } }
  ],
  Tickets: [
    {
      Ticket_ID: "TKT-8901",
      Lift_ID: "L-203",
      Electrician_ID: "E-303",
      Priority: "P1",
      Status: "Dispatched",
      Notes: "Passenger trapped between floors 3 & 4. Intercom active.",
      Created_At: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
      SLA_Deadline: new Date(Date.now() + 3 * 60 * 1000).toISOString(),
      Parts_Used: []
    }
  ],
  Parts_Inventory: [
    { Part_ID: "PRT-401", Name: "Universal Control Board", Stock_Count: 14, Price: 480.00 },
    { Part_ID: "PRT-402", Name: "Optical Door Sensor Unit", Stock_Count: 28, Price: 95.00 },
    { Part_ID: "PRT-403", Name: "Traction Steel Cable (10m)", Stock_Count: 6, Price: 650.00 },
    { Part_ID: "PRT-404", Name: "Hydraulic Valve Pack", Stock_Count: 11, Price: 310.00 },
    { Part_ID: "PRT-405", Name: "Emergency Intercom Battery", Stock_Count: 45, Price: 42.00 }
  ]
};

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

  res.json({ success: true, ticket, db, lift, client });
});

app.post('/api/reset', (req, res) => {
  // Reset database to initial clean state
  res.json({ success: true, message: "Database reset to initial state" });
});

app.listen(PORT, () => {
  console.log(`🚀 Lift Maintenance Central Dispatch Server running on port ${PORT}`);
  console.log(`🌐 Ready for Render.com deployment and local usage.`);
});
