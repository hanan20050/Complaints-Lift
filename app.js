/* ==========================================================================
   LIFT-OS | CORE ARCHITECTURAL ENGINE & INTERACTIVE SIMULATOR
   ========================================================================== */

// Initial Seed Data (Fallback & Reset Template - Pakistani Context)
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
    { Part_ID: "PRT-401", Name: "Universal Control Board", Stock_Count: 14, Price: 480.00 },
    { Part_ID: "PRT-402", Name: "Optical Door Sensor Unit", Stock_Count: 28, Price: 95.00 },
    { Part_ID: "PRT-403", Name: "Traction Steel Cable (10m)", Stock_Count: 6, Price: 650.00 },
    { Part_ID: "PRT-404", Name: "Hydraulic Valve Pack", Stock_Count: 11, Price: 310.00 },
    { Part_ID: "PRT-405", Name: "Emergency Intercom Battery", Stock_Count: 45, Price: 42.00 }
  ]
};

// State Engine
let appState = JSON.parse(JSON.stringify(INITIAL_SEED_DB));
let activeClientProfile = null;
let activeLiftProfile = null;
let selectedElectricianId = null;
let selectedIssuePriority = null;
let activeDbTab = "Clients";
let isOnlineSync = false;

// Cellular Dead Zone State & Buffer
let cellularConnected = true;
let pendingDoneSMS = null; // Buffer for when tech texts DONE inside dead zone
let currentActiveTechTicketId = null;
let selectedResolutionParts = [];

/* ==========================================================================
   INITIALIZATION & RENDER API SYNC
   ========================================================================== */
document.addEventListener('DOMContentLoaded', async () => {
  await trySyncWithRenderServer();
  setupEventListeners();
  renderAll();
  startLiveSLAInterval();
});

async function trySyncWithRenderServer() {
  const statusPill = document.getElementById('server-status-pill');
  try {
    const res = await fetch('/api/state', { method: 'GET', headers: { 'Accept': 'application/json' } });
    if (res.ok) {
      const data = await res.json();
      if (data && data.db) {
        appState = data.db;
        isOnlineSync = true;
        statusPill.textContent = "● Render API Sync Active";
        statusPill.className = "status-pill online";
        return;
      }
    }
  } catch (err) {
    // Fallback to local execution
  }
  isOnlineSync = false;
  statusPill.textContent = "● Standalone Client (Local)";
  statusPill.style.background = "rgba(59, 130, 246, 0.15)";
  statusPill.style.color = "#3b82f6";
  statusPill.style.borderColor = "rgba(59, 130, 246, 0.3)";
}

/* ==========================================================================
   MAIN RENDER ORCHESTRATOR
   ========================================================================== */
function renderAll() {
  updateHeaderMetrics();
  renderElectricianRoster();
  renderGeospatialMap();
  renderActiveQueue();
  renderPartsDropdown();
  renderDbTable(activeDbTab);
  updateTechConsoleJobView();
}

function updateHeaderMetrics() {
  // P1 Count
  const p1Count = appState.Tickets.filter(t => t.Priority === 'P1' && t.Status !== 'Closed').length;
  document.getElementById('stat-p1-count').textContent = p1Count;
  const p1Badge = document.querySelector('.metric-badge.critical');
  if (p1Count > 0) p1Badge.classList.remove('hidden');

  // Free Techs
  const freeTechs = appState.Electricians.filter(e => e.Status === 'Free').length;
  document.getElementById('stat-free-techs').textContent = `${freeTechs} / ${appState.Electricians.length}`;

  // Open Tickets
  const openCount = appState.Tickets.filter(t => t.Status !== 'Closed').length;
  document.getElementById('stat-open-tickets').textContent = openCount;
  document.getElementById('queue-total-label').textContent = `${openCount} Active Ticket${openCount !== 1 ? 's' : ''}`;
}

/* ==========================================================================
   ZONE 1: RAPID INTAKE & AUTO-FILL ENGINE
   ========================================================================== */
function setupEventListeners() {
  // Phone Search Input
  const phoneSearch = document.getElementById('phone-search');
  const quickSelect = document.getElementById('quick-client-select');
  const issueDropdown = document.getElementById('issue-dropdown');
  const dispatchBtn = document.getElementById('assign-dispatch-btn');

  phoneSearch.addEventListener('input', (e) => handlePhoneSearch(e.target.value.trim()));
  quickSelect.addEventListener('change', (e) => {
    if (e.target.value) {
      phoneSearch.value = e.target.value;
      handlePhoneSearch(e.target.value);
    }
  });

  issueDropdown.addEventListener('change', (e) => {
    const selectedOpt = e.target.options[e.target.selectedIndex];
    selectedIssuePriority = selectedOpt.getAttribute('data-priority') || null;
    const priDisplay = document.getElementById('profile-priority-display');
    if (selectedIssuePriority) {
      priDisplay.textContent = `${selectedIssuePriority} (${e.target.value})`;
      priDisplay.className = `detail-value priority-display ${selectedIssuePriority === 'P1' ? 'p1-alert' : ''}`;
      
      // Manual selection flow: clear selected technician and prompt manual pick
      selectedElectricianId = null;
      document.getElementById('map-overlay-info').innerHTML = "👉 <strong>Select a Free Technician (Green Dot)</strong> from the map or roster list to assign.";
      renderElectricianRoster();
      renderGeospatialMap();
    } else {
      priDisplay.textContent = "-- Select Issue --";
      selectedElectricianId = null;
      document.getElementById('map-overlay-info').textContent = "Select a client in Zone 1 to calculate distance & ETA for field teams.";
      renderElectricianRoster();
      renderGeospatialMap();
    }
    dispatchBtn.disabled = true; // Dispatch button stays disabled until a tech is clicked
  });

  dispatchBtn.addEventListener('click', handleSmartDispatch);

  // SMS Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.phone-screen-container').forEach(sc => sc.classList.add('hidden'));
      e.target.classList.add('active');
      document.getElementById(`tab-${e.target.dataset.tab}`).classList.remove('hidden');
    });
  });

  // Dead zone toggle
  const deadzoneBtn = document.getElementById('deadzone-toggle-btn');
  deadzoneBtn.addEventListener('click', toggleDeadzoneState);

  // Resolution Parts
  document.getElementById('res-parts-select').addEventListener('change', (e) => {
    const partId = e.target.value;
    if (!partId) return;
    const partObj = appState.Parts_Inventory.find(p => p.Part_ID === partId);
    if (partObj) {
      selectedResolutionParts.push({ Part_ID: partObj.Part_ID, Name: partObj.Name, Price: partObj.Price, Quantity: 1 });
      renderSelectedPartsPills();
      e.target.value = "";
    }
  });

  // Send DONE Button
  document.getElementById('res-send-done-btn').addEventListener('click', handleTechSendDone);

  // Registration Tabs Toggle
  document.querySelectorAll('.reg-tab').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.reg-tab').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      const targetTab = e.target.dataset.regTab;
      document.getElementById('reg-client-form').className = targetTab === 'reg-client' ? 'reg-form-container active' : 'reg-form-container hidden';
      document.getElementById('reg-tech-form').className = targetTab === 'reg-tech' ? 'reg-form-container active' : 'reg-form-container hidden';
    });
  });

  // Pakistani phone number format helper
  function validatePakistaniPhone(phone) {
    let cleaned = phone.replace(/[\s\-\(\)]/g, '');
    if (cleaned.startsWith('03')) {
      cleaned = '+92' + cleaned.substring(1);
    } else if (cleaned.startsWith('923')) {
      cleaned = '+' + cleaned;
    }
    const reg = /^\+923\d{9}$/;
    if (reg.test(cleaned)) return cleaned;
    return null;
  }

  // Client & Lift Register Submit Handler
  document.getElementById('submit-new-client-btn').addEventListener('click', async (e) => {
    e.preventDefault();
    const name = document.getElementById('new-client-name').value.trim();
    const phoneInput = document.getElementById('new-client-phone').value.trim();
    const address = document.getElementById('new-client-address').value.trim();
    const brand = document.getElementById('new-lift-brand').value.trim();
    const ownership = document.getElementById('new-lift-ownership').value;
    const sla = document.getElementById('new-lift-sla').value;

    if (!name || !phoneInput || !address || !brand) {
      alert("Please fill in all client and lift details.");
      return;
    }

    const validatedPhone = validatePakistaniPhone(phoneInput);
    if (!validatedPhone) {
      alert("Invalid Pakistani Mobile Number. Please enter in the format +923XXXXXXXXX or 03XXXXXXXXX.");
      return;
    }

    const payload = {
      Name: name,
      Phone_Number: validatedPhone,
      Address: address,
      Brand: brand,
      Ownership_Type: ownership,
      SLA_Tier: sla
    };

    if (isOnlineSync) {
      try {
        const res = await fetch('/api/clients/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const data = await res.json();
          appState = data.db;
        }
      } catch (err) {
        console.error("API Error - saving client locally", err);
      }
    }

    if (!isOnlineSync) {
      const Client_ID = `C-${Math.floor(100 + Math.random() * 900)}`;
      const Lift_ID = `L-${Math.floor(200 + Math.random() * 800)}`;
      const clientObj = { Client_ID, Name: name, Phone_Number: validatedPhone, Billing_Address: address };
      const liftObj = {
        Lift_ID,
        Client_ID,
        Ownership_Type: ownership,
        Brand: brand,
        Address: address,
        SLA_Tier: sla,
        x: Math.floor(50 + Math.random() * 550),
        y: Math.floor(50 + Math.random() * 220)
      };
      appState.Clients.push(clientObj);
      appState.Lifts.push(liftObj);
    }

    // Add option to quick client select dynamically
    const select = document.getElementById('quick-client-select');
    const opt = document.createElement('option');
    opt.value = validatedPhone;
    opt.textContent = `📞 ${name} (${validatedPhone}) - ${ownership}`;
    select.appendChild(opt);

    alert(`Client "${name}" and Lift "${brand}" registered successfully!`);
    
    // Clear inputs
    document.getElementById('new-client-name').value = "";
    document.getElementById('new-client-phone').value = "";
    document.getElementById('new-client-address').value = "";
    document.getElementById('new-lift-brand').value = "";

    renderAll();
  });

  // Electrician Register Submit Handler
  document.getElementById('submit-new-tech-btn').addEventListener('click', async (e) => {
    e.preventDefault();
    const name = document.getElementById('new-tech-name').value.trim();
    const phoneInput = document.getElementById('new-tech-phone').value.trim();
    const status = document.getElementById('new-tech-status').value;

    if (!name || !phoneInput) {
      alert("Please fill in all technician details.");
      return;
    }

    const validatedPhone = validatePakistaniPhone(phoneInput);
    if (!validatedPhone) {
      alert("Invalid Pakistani Mobile Number. Please enter in the format +923XXXXXXXXX or 03XXXXXXXXX.");
      return;
    }

    const payload = { Name: name, Phone: validatedPhone, Status: status };

    if (isOnlineSync) {
      try {
        const res = await fetch('/api/electricians/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const data = await res.json();
          appState = data.db;
        }
      } catch (err) {
        console.error("API Error - saving electrician locally", err);
      }
    }

    if (!isOnlineSync) {
      const Electrician_ID = `E-${Math.floor(300 + Math.random() * 700)}`;
      const electricianObj = {
        Electrician_ID,
        Name: name,
        Phone: validatedPhone,
        Status: status,
        GPS: {
          x: Math.floor(50 + Math.random() * 550),
          y: Math.floor(50 + Math.random() * 220),
          lat: 30.0 + Math.random() * 4,
          lng: 70.0 + Math.random() * 4
        }
      };
      appState.Electricians.push(electricianObj);
    }

    alert(`Electrician "${name}" registered successfully!`);
    
    // Clear inputs
    document.getElementById('new-tech-name').value = "";
    document.getElementById('new-tech-phone').value = "";

    renderAll();
  });

  // DB Tabs
  document.querySelectorAll('.db-tab').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.db-tab').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      activeDbTab = e.target.dataset.table;
      renderDbTable(activeDbTab);
    });
  });

  // Reset DB Button
  document.getElementById('reset-db-btn').addEventListener('click', async () => {
    if (confirm("Reset local/Render demo database to initial state?")) {
      appState = JSON.parse(JSON.stringify(INITIAL_SEED_DB));
      if (isOnlineSync) {
        await fetch('/api/reset', { method: 'POST' });
      }
      activeClientProfile = null;
      activeLiftProfile = null;
      selectedElectricianId = null;
      selectedIssuePriority = null;
      document.getElementById('asset-profile-card').classList.add('hidden');
      document.getElementById('issue-dropdown').disabled = true;
      document.getElementById('assign-dispatch-btn').disabled = true;
      document.getElementById('phone-search').value = "";
      renderAll();
    }
  });

  // Close Billing Modal
  document.getElementById('close-modal-btn').addEventListener('click', () => {
    document.getElementById('billing-modal').classList.add('hidden');
  });
}

function handlePhoneSearch(phoneQuery) {
  const card = document.getElementById('asset-profile-card');
  const issueDropdown = document.getElementById('issue-dropdown');
  const dispatchBtn = document.getElementById('assign-dispatch-btn');

  const client = appState.Clients.find(c => c.Phone_Number.includes(phoneQuery));
  if (!client) {
    card.classList.add('hidden');
    issueDropdown.disabled = true;
    dispatchBtn.disabled = true;
    activeClientProfile = null;
    activeLiftProfile = null;
    return;
  }

  const lift = appState.Lifts.find(l => l.Client_ID === client.Client_ID);
  if (!lift) return;

  activeClientProfile = client;
  activeLiftProfile = lift;

  // Populate UI
  document.getElementById('profile-client-name').textContent = client.Name;
  document.getElementById('profile-client-phone').textContent = `Phone: ${client.Phone_Number} • ID: ${client.Client_ID}`;
  document.getElementById('profile-lift-brand').textContent = `${lift.Lift_ID} • ${lift.Brand}`;
  document.getElementById('profile-address').textContent = lift.Address;

  const ownershipBadge = document.getElementById('profile-ownership-badge');
  ownershipBadge.textContent = lift.Ownership_Type === '3rd-Party' ? '3rd-Party Contract (Billable)' : 'Internal Asset (Warranty Cover)';
  ownershipBadge.className = `badge ownership-badge ${lift.Ownership_Type === '3rd-Party' ? 'third-party' : 'internal'}`;

  const slaBadge = document.getElementById('profile-sla-badge');
  slaBadge.textContent = `SLA Tier: ${lift.SLA_Tier}`;

  card.classList.remove('hidden');
  issueDropdown.disabled = false;

  // Require manual technician selection
  selectedElectricianId = null;
  dispatchBtn.disabled = true;
  document.getElementById('map-overlay-info').innerHTML = "👉 <strong>Select a Free Technician (Green Dot)</strong> from the map or roster list to assign.";

  renderGeospatialMap();
}

function autoPickNearestFreeTech(lift) {
  const freeTechs = appState.Electricians.filter(e => e.Status === 'Free');
  if (freeTechs.length === 0) {
    selectedElectricianId = null;
    return;
  }

  let nearestTech = null;
  let minDist = Infinity;

  freeTechs.forEach(tech => {
    const dist = Math.hypot((tech.GPS?.x || 100) - (lift.x || 200), (tech.GPS?.y || 100) - (lift.y || 150));
    if (dist < minDist) {
      minDist = dist;
      nearestTech = tech;
    }
  });

  if (nearestTech) {
    selectedElectricianId = nearestTech.Electrician_ID;
    renderElectricianRoster();
    renderGeospatialMap();
  }
}

/* ==========================================================================
   ZONE 2: MAP & ROSTER RENDERER
   ========================================================================== */
function renderElectricianRoster() {
  const rosterContainer = document.getElementById('electrician-roster-list');
  rosterContainer.innerHTML = "";

  appState.Electricians.forEach(tech => {
    const card = document.createElement('div');
    card.className = `tech-card ${selectedElectricianId === tech.Electrician_ID ? 'selected' : ''}`;
    
    // Calculate distance if lift is selected
    let distStr = "";
    if (activeLiftProfile && tech.GPS && activeLiftProfile.x) {
      const distUnits = Math.hypot(tech.GPS.x - activeLiftProfile.x, tech.GPS.y - activeLiftProfile.y);
      const miles = (distUnits / 60).toFixed(1);
      const mins = Math.max(3, Math.round(distUnits / 12));
      distStr = `<span class="dist-badge">📍 ${miles} mi (${mins}m ETA)</span>`;
    }

    card.innerHTML = `
      <div class="tech-card-header">
        <span class="tech-name">${tech.Name}</span>
        <i class="status-dot ${tech.Status.replace(/\s+/g, '')}"></i>
      </div>
      <div class="tech-meta">
        <span>ID: ${tech.Electrician_ID} • ${tech.Status}</span>
        <span>📞 ${tech.Phone}</span>
        ${distStr}
      </div>
    `;

    if (tech.Status === 'Free') {
      card.addEventListener('click', () => {
        selectedElectricianId = tech.Electrician_ID;
        renderElectricianRoster();
        renderGeospatialMap();
        
        // Enable dispatch button if we have client and issue
        const dispatchBtn = document.getElementById('assign-dispatch-btn');
        if (activeLiftProfile && selectedIssuePriority) {
          dispatchBtn.disabled = false;
        }

        // Update map overlay info to show ETA
        if (activeLiftProfile && tech.GPS) {
          const distUnits = Math.hypot(tech.GPS.x - activeLiftProfile.x, tech.GPS.y - activeLiftProfile.y);
          const miles = (distUnits / 60).toFixed(1);
          const mins = Math.max(3, Math.round(distUnits / 12));
          document.getElementById('map-overlay-info').innerHTML = `👷 Selected Technician: <strong>${tech.Name}</strong> is <strong>${miles} miles</strong> away (<strong>${mins}m ETA</strong>). Ready for dispatch.`;
        }
      });
    }

    rosterContainer.appendChild(card);
  });
}

function renderGeospatialMap() {
  const svg = document.getElementById('geospatial-map');
  svg.innerHTML = "";

  // 1. Draw Grid Lines & Streets
  for (let i = 40; i < 650; i += 60) {
    const vline = document.createElementNS("http://www.w3.org/2000/svg", "line");
    vline.setAttribute("x1", i); vline.setAttribute("y1", 0);
    vline.setAttribute("x2", i); vline.setAttribute("y2", 320);
    vline.setAttribute("stroke", "rgba(255,255,255,0.04)"); vline.setAttribute("stroke-width", "1");
    svg.appendChild(vline);
  }
  for (let j = 40; j < 320; j += 60) {
    const hline = document.createElementNS("http://www.w3.org/2000/svg", "line");
    hline.setAttribute("x1", 0); hline.setAttribute("y1", j);
    hline.setAttribute("x2", 650); hline.setAttribute("y2", j);
    hline.setAttribute("stroke", "rgba(255,255,255,0.04)"); hline.setAttribute("stroke-width", "1");
    svg.appendChild(hline);
  }

  // 2. Draw Route Line if activeLift & selectedElectrician
  if (activeLiftProfile && selectedElectricianId) {
    const tech = appState.Electricians.find(e => e.Electrician_ID === selectedElectricianId);
    if (tech && tech.GPS && activeLiftProfile.x) {
      const route = document.createElementNS("http://www.w3.org/2000/svg", "line");
      route.setAttribute("x1", tech.GPS.x); route.setAttribute("y1", tech.GPS.y);
      route.setAttribute("x2", activeLiftProfile.x); route.setAttribute("y2", activeLiftProfile.y);
      route.setAttribute("stroke", "#3b82f6"); route.setAttribute("stroke-width", "2.5");
      route.setAttribute("stroke-dasharray", "6,6");
      svg.appendChild(route);
    }
  }

  // 3. Draw All Lifts
  appState.Lifts.forEach(lift => {
    const lx = lift.x || 200;
    const ly = lift.y || 150;
    const isSelected = activeLiftProfile && activeLiftProfile.Lift_ID === lift.Lift_ID;
    const hasOpenTicket = appState.Tickets.some(t => t.Lift_ID === lift.Lift_ID && t.Status !== 'Closed');

    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    
    // Pulse circle if active/emergency
    if (isSelected || hasOpenTicket) {
      const pulse = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      pulse.setAttribute("cx", lx); pulse.setAttribute("cy", ly);
      pulse.setAttribute("r", "16");
      pulse.setAttribute("fill", isSelected ? "rgba(59, 130, 246, 0.25)" : "rgba(239, 68, 68, 0.25)");
      group.appendChild(pulse);
    }

    const pin = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    pin.setAttribute("x", lx - 6); pin.setAttribute("y", ly - 6);
    pin.setAttribute("width", "12"); pin.setAttribute("height", "12");
    pin.setAttribute("rx", "2");
    pin.setAttribute("fill", isSelected ? "#3b82f6" : hasOpenTicket ? "#ef4444" : "#64748b");
    pin.setAttribute("transform", `rotate(45 ${lx} ${ly})`);
    group.appendChild(pin);

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", lx); label.setAttribute("y", ly - 14);
    label.setAttribute("fill", "#fff"); label.setAttribute("font-size", "10"); label.setAttribute("font-weight", "600");
    label.setAttribute("text-anchor", "middle");
    label.textContent = lift.Lift_ID;
    group.appendChild(label);

    svg.appendChild(group);
  });

  // 4. Draw All Electricians
  appState.Electricians.forEach(tech => {
    const tx = tech.GPS?.x || 150;
    const ty = tech.GPS?.y || 150;
    const isSelected = selectedElectricianId === tech.Electrician_ID;

    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");

    if (isSelected) {
      const outerRing = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      outerRing.setAttribute("cx", tx); outerRing.setAttribute("cy", ty); outerRing.setAttribute("r", "14");
      outerRing.setAttribute("fill", "none"); outerRing.setAttribute("stroke", "#10b981"); outerRing.setAttribute("stroke-width", "2");
      group.appendChild(outerRing);
    }

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", tx); circle.setAttribute("cy", ty); circle.setAttribute("r", "8");
    circle.setAttribute("fill", tech.Status === 'Free' ? "#10b981" : tech.Status === 'On Job' ? "#f59e0b" : "#ef4444");
    group.appendChild(circle);

    const nameLbl = document.createElementNS("http://www.w3.org/2000/svg", "text");
    nameLbl.setAttribute("x", tx); nameLbl.setAttribute("y", ty + 20);
    nameLbl.setAttribute("fill", "#94a3b8"); nameLbl.setAttribute("font-size", "9"); nameLbl.setAttribute("font-weight", "500");
    nameLbl.setAttribute("text-anchor", "middle");
    nameLbl.textContent = tech.Name.split(' ')[0];
    group.appendChild(nameLbl);

    if (tech.Status === 'Free') {
      group.style.cursor = 'pointer';
      group.addEventListener('click', () => {
        selectedElectricianId = tech.Electrician_ID;
        renderElectricianRoster();
        renderGeospatialMap();

        const dispatchBtn = document.getElementById('assign-dispatch-btn');
        if (activeLiftProfile && selectedIssuePriority) {
          dispatchBtn.disabled = false;
        }

        let distOverlayStr = "";
        if (activeLiftProfile && activeLiftProfile.x) {
          const distUnits = Math.hypot(tx - activeLiftProfile.x, ty - activeLiftProfile.y);
          const miles = (distUnits / 60).toFixed(1);
          const mins = Math.max(3, Math.round(distUnits / 12));
          distOverlayStr = `👷 Selected Technician: <strong>${tech.Name}</strong> is <strong>${miles} miles</strong> away (<strong>${mins}m ETA</strong>). Ready for dispatch.`;
        } else {
          distOverlayStr = `👷 Selected Technician: <strong>${tech.Name}</strong>. Select a client in Zone 1 to calculate ETA.`;
        }
        document.getElementById('map-overlay-info').innerHTML = distOverlayStr;
      });
    }

    svg.appendChild(group);
  });
}

/* ==========================================================================
   ZONE 3: ACTIVE QUEUE & SLA TIMERS
   ========================================================================== */
function renderActiveQueue() {
  const queueList = document.getElementById('tickets-queue-list');
  queueList.innerHTML = "";

  // Strictly order by priority: P1 -> P2 -> P3 -> P4
  const activeTickets = appState.Tickets.filter(t => t.Status !== 'Closed').sort((a, b) => {
    const priOrder = { P1: 1, P2: 2, P3: 3, P4: 4 };
    return (priOrder[a.Priority] || 9) - (priOrder[b.Priority] || 9);
  });

  if (activeTickets.length === 0) {
    queueList.innerHTML = `<div class="message system-msg">🎉 All lift assets operational. Active queue empty.</div>`;
    return;
  }

  activeTickets.forEach(tkt => {
    const lift = appState.Lifts.find(l => l.Lift_ID === tkt.Lift_ID) || {};
    const client = appState.Clients.find(c => c.Client_ID === lift.Client_ID) || {};
    const tech = appState.Electricians.find(e => e.Electrician_ID === tkt.Electrician_ID);

    const card = document.createElement('div');
    card.className = `ticket-card ${tkt.Priority === 'P1' ? 'priority-p1' : ''}`;
    
    card.innerHTML = `
      <div class="ticket-main">
        <div class="ticket-top">
          <span class="ticket-id">#${tkt.Ticket_ID}</span>
          <span class="priority-pill ${tkt.Priority}">${tkt.Priority}</span>
          <span class="ticket-client">${client.Name || 'Unknown Client'} (${lift.Lift_ID || ''})</span>
        </div>
        <p class="ticket-notes">Address: ${lift.Address || 'N/A'}</p>
        <p class="ticket-notes"><em>Issue: ${tkt.Notes}</em></p>
      </div>
      <div class="ticket-meta-side">
        <span class="tech-pill">${tech ? `👷 ${tech.Name}` : '⚠️ Unassigned'}</span>
        <span class="sla-timer" data-deadline="${tkt.SLA_Deadline}">Calculating SLA...</span>
      </div>
    `;

    queueList.appendChild(card);
  });

  updateSLACountdowns();
}

function startLiveSLAInterval() {
  setInterval(updateSLACountdowns, 1000);
}

function updateSLACountdowns() {
  document.querySelectorAll('.sla-timer').forEach(el => {
    const deadlineStr = el.getAttribute('data-deadline');
    if (!deadlineStr) return;
    const deadline = new Date(deadlineStr).getTime();
    const now = Date.now();
    const diffSec = Math.round((deadline - now) / 1000);

    if (diffSec <= 0) {
      el.textContent = "⚠️ SLA BREACHED!";
      el.className = "sla-timer danger";
    } else {
      const mins = Math.floor(diffSec / 60);
      const secs = diffSec % 60;
      el.textContent = `⏱️ SLA: ${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
      if (mins < 5) el.className = "sla-timer danger";
      else if (mins < 15) el.className = "sla-timer warning";
      else el.className = "sla-timer";
    }
  });
}

/* ==========================================================================
   STEP 3 & 4: SMART DISPATCH & THE AUTOMATED SMS HANDSHAKE
   ========================================================================== */
async function handleSmartDispatch() {
  if (!activeLiftProfile || !selectedIssuePriority || !selectedElectricianId) {
    alert("Please ensure Caller, Issue Category, and an Electrician are selected.");
    return;
  }

  const issueText = document.getElementById('issue-dropdown').value;
  const electrician = appState.Electricians.find(e => e.Electrician_ID === selectedElectricianId);

  // Calculate ETA
  const distUnits = Math.hypot((electrician.GPS?.x || 150) - activeLiftProfile.x, (electrician.GPS?.y || 150) - activeLiftProfile.y);
  const etaMins = Math.max(3, Math.round(distUnits / 12));

  // Create Ticket & Dispatch
  const newTicketId = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;
  const slaMins = selectedIssuePriority === 'P1' ? 15 : selectedIssuePriority === 'P2' ? 30 : selectedIssuePriority === 'P3' ? 240 : 1440;

  const newTicket = {
    Ticket_ID: newTicketId,
    Lift_ID: activeLiftProfile.Lift_ID,
    Electrician_ID: selectedElectricianId,
    Priority: selectedIssuePriority,
    Status: "Dispatched",
    Notes: issueText,
    Created_At: new Date().toISOString(),
    SLA_Deadline: new Date(Date.now() + slaMins * 60 * 1000).toISOString(),
    Parts_Used: []
  };

  if (isOnlineSync) {
    try {
      await fetch('/api/tickets/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Lift_ID: activeLiftProfile.Lift_ID, Priority: selectedIssuePriority, Notes: issueText })
      });
    } catch (e) { /* ignore */ }
  }

  // Update local memory state
  appState.Tickets.unshift(newTicket);
  electrician.Status = "On Job";
  currentActiveTechTicketId = newTicketId;

  // FIRE AUTOMATED SMS HANDSHAKE TO SIMULATOR & REAL GATEWAY
  const consumerMsg = `Automated Dispatch: Lift ticket #${newTicketId} logged for ${activeClientProfile.Name}. Our electrician ${electrician.Name} is en route.\nETA: ${etaMins} mins.`;
  const techMsg = `NEW JOB DISPATCH [${selectedIssuePriority}]:\nAddress: ${activeLiftProfile.Address}\nLift: ${activeLiftProfile.Ownership_Type} / ${activeLiftProfile.Brand}\nIssue: ${issueText}\nGate Code: #4829`;

  addConsumerMessage(consumerMsg, 'incoming');
  addElectricianMessage(techMsg, 'incoming');

  // Trigger Real SMS Gateway Calls via Proxy API (runs asynchronously)
  triggerRealSMS(activeClientProfile.Phone_Number, consumerMsg);
  triggerRealSMS(electrician.Phone, techMsg);

  // Clear Intake
  document.getElementById('issue-dropdown').value = "";
  document.getElementById('profile-priority-display').textContent = "-- Select Issue --";
  document.getElementById('assign-dispatch-btn').disabled = true;

  renderAll();
  
  // Auto switch simulator to Electrician view after 1.5s so user sees the brief
  setTimeout(() => {
    document.querySelector('.tab-btn[data-tab="electrician"]').click();
  }, 1200);
}

// Function to trigger real SMS via the secured Node.js Express proxy
async function triggerRealSMS(receivernum, textmessage) {
  try {
    const response = await fetch('/api/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ receivernum, textmessage })
    });
    const result = await response.json();
    console.log("📡 Real SMS API response status:", result);
    return result;
  } catch (error) {
    console.warn("⚠️ Standalone mode: SMS simulated locally, Express API server offline.", error.message);
    return { success: false, error: error.message };
  }
}

function addConsumerMessage(text, type) {
  const log = document.getElementById('consumer-chat-log');
  const div = document.createElement('div');
  div.className = `message ${type}`;
  div.innerText = text;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

function addElectricianMessage(text, type) {
  const log = document.getElementById('electrician-chat-log');
  const div = document.createElement('div');
  div.className = `message ${type}`;
  div.innerText = text;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

/* ==========================================================================
   STEP 5 & 6: REMOTE RESOLUTION, DEAD ZONE SIMULATION & BILLING
   ========================================================================== */
function toggleDeadzoneState() {
  cellularConnected = !cellularConnected;
  const btn = document.getElementById('deadzone-toggle-btn');
  const text = document.getElementById('signal-text');
  const cacheNotice = document.getElementById('res-cache-notice');

  if (cellularConnected) {
    btn.className = "signal-btn online";
    text.textContent = "Connected (Strong Signal)";
    cacheNotice.classList.add('hidden');

    // If there is a pending cached DONE SMS, fire it automatically now!
    if (pendingDoneSMS) {
      addElectricianMessage(`[SYSTEM RECOVERY] Signal regained! Auto-transmitting cached SMS: "DONE ${pendingDoneSMS.Ticket_ID}"`, 'outgoing');
      processDoneResolution(pendingDoneSMS.Ticket_ID, pendingDoneSMS.Parts_Used, pendingDoneSMS.Notes);
      pendingDoneSMS = null;
    }
  } else {
    btn.className = "signal-btn offline";
    text.textContent = "Cellular Dead Zone (Offline Caching)";
    cacheNotice.classList.remove('hidden');
  }
}

function updateTechConsoleJobView() {
  const form = document.getElementById('resolution-form');
  const activeJob = appState.Tickets.find(t => t.Status === 'Dispatched');

  if (!activeJob) {
    form.classList.add('hidden');
    return;
  }

  currentActiveTechTicketId = activeJob.Ticket_ID;
  const tech = appState.Electricians.find(e => e.Electrician_ID === activeJob.Electrician_ID);
  if (tech) {
    document.getElementById('tech-active-name').textContent = `${tech.Name} (${tech.Electrician_ID})`;
  }

  const lift = appState.Lifts.find(l => l.Lift_ID === activeJob.Lift_ID);
  if (lift) {
    document.getElementById('res-ownership-type').textContent = `${lift.Ownership_Type} (${lift.Brand})`;
  }

  form.classList.remove('hidden');
}

function renderPartsDropdown() {
  const select = document.getElementById('res-parts-select');
  select.innerHTML = `<option value="">-- Add Part Used (For Automatic Billing) --</option>`;
  appState.Parts_Inventory.forEach(part => {
    const opt = document.createElement('option');
    opt.value = part.Part_ID;
    opt.textContent = `${part.Name} ($${part.Price.toFixed(2)}) - Stock: ${part.Stock_Count}`;
    select.appendChild(opt);
  });
}

function renderSelectedPartsPills() {
  const container = document.getElementById('selected-parts-list');
  container.innerHTML = "";
  selectedResolutionParts.forEach((part, idx) => {
    const pill = document.createElement('div');
    pill.className = "part-pill";
    pill.innerHTML = `
      <span>📦 ${part.Name} ($${part.Price.toFixed(2)})</span>
      <button class="part-remove-btn" onclick="removeSelectedPart(${idx})">✕</button>
    `;
    container.appendChild(pill);
  });
}

window.removeSelectedPart = (idx) => {
  selectedResolutionParts.splice(idx, 1);
  renderSelectedPartsPills();
};

function handleTechSendDone() {
  if (!currentActiveTechTicketId) return;
  const notes = document.getElementById('res-notes-input').value.trim() || "Repaired.";

  if (!cellularConnected) {
    // DEAD ZONE BUFFER logic
    pendingDoneSMS = {
      Ticket_ID: currentActiveTechTicketId,
      Parts_Used: [...selectedResolutionParts],
      Notes: notes
    };
    addElectricianMessage(`DONE ${currentActiveTechTicketId}\n[BUFFERED - DEAD ZONE]: SMS cached locally on device. Will auto-send immediately when electrician exits shaft and regains signal.`, 'outgoing');
    alert("📡 Cellular Dead Zone Active!\n\nYour SMS 'DONE' payload has been saved to device local storage. Toggle signal to 'Connected' to simulate exiting the elevator shaft.");
    return;
  }

  // Online instant transmission
  addElectricianMessage(`DONE ${currentActiveTechTicketId}`, 'outgoing');
  processDoneResolution(currentActiveTechTicketId, selectedResolutionParts, notes);
}

function processDoneResolution(ticketId, partsUsed, notes) {
  const ticket = appState.Tickets.find(t => t.Ticket_ID === ticketId);
  if (!ticket) return;

  ticket.Status = "Closed";
  ticket.Parts_Used = partsUsed || [];
  if (notes) ticket.Notes += ` [Resolved: ${notes}]`;

  // Deduct inventory
  (partsUsed || []).forEach(partItem => {
    const invPart = appState.Parts_Inventory.find(p => p.Part_ID === partItem.Part_ID);
    if (invPart && invPart.Stock_Count > 0) {
      invPart.Stock_Count -= 1;
    }
  });

  // Free up tech
  const tech = appState.Electricians.find(e => e.Electrician_ID === ticket.Electrician_ID);
  if (tech) tech.Status = "Free";

  const lift = appState.Lifts.find(l => l.Lift_ID === ticket.Lift_ID) || {};
  const client = appState.Clients.find(c => c.Client_ID === lift.Client_ID) || {};

  // Text consumer confirmation
  const completionMsg = `Automated Confirmation: Your lift at ${lift.Address || 'the property'} has been repaired. Ticket #${ticketId} is now closed. Thank you!`;
  addConsumerMessage(completionMsg, 'incoming');

  // Trigger Real SMS Gateway Call via Proxy API
  triggerRealSMS(client.Phone_Number, completionMsg);

  // Reset form parts
  selectedResolutionParts = [];
  renderSelectedPartsPills();
  document.getElementById('res-notes-input').value = "";

  renderAll();

  // If 3rd-Party, trigger Automatic Billing calculation
  if (lift.Ownership_Type === '3rd-Party') {
    setTimeout(() => showBillingModal(ticket, client, lift, partsUsed || []), 800);
  }
}

function showBillingModal(ticket, client, lift, partsUsed) {
  document.getElementById('modal-ticket-id').textContent = `#${ticket.Ticket_ID}`;
  document.getElementById('modal-client-name').textContent = client.Name || '3rd-Party Client';
  document.getElementById('modal-lift-brand').textContent = `${lift.Lift_ID} • ${lift.Brand}`;

  const partsContainer = document.getElementById('modal-parts-list');
  partsContainer.innerHTML = "";

  let totalAmount = 250.00; // Standard labor fee

  partsUsed.forEach(part => {
    totalAmount += part.Price;
    const row = document.createElement('div');
    row.className = "billing-row";
    row.innerHTML = `<span>Part Used: ${part.Name}</span><span>$${part.Price.toFixed(2)}</span>`;
    partsContainer.appendChild(row);
  });

  document.getElementById('modal-total-amount').textContent = `$${totalAmount.toFixed(2)}`;
  document.getElementById('billing-modal').classList.remove('hidden');
}

/* ==========================================================================
   DATABASE INSPECTOR TABLE RENDERER
   ========================================================================== */
function renderDbTable(tableName) {
  const data = appState[tableName] || [];
  const headersRow = document.getElementById('db-table-headers');
  const bodyRow = document.getElementById('db-table-body');

  headersRow.innerHTML = "";
  bodyRow.innerHTML = "";

  if (data.length === 0) {
    bodyRow.innerHTML = `<tr><td colspan="5">No records in ${tableName}</td></tr>`;
    return;
  }

  const keys = Object.keys(data[0]);
  keys.forEach(k => {
    const th = document.createElement('th');
    th.textContent = k;
    headersRow.appendChild(th);
  });

  data.forEach(item => {
    const tr = document.createElement('tr');
    keys.forEach(k => {
      const td = document.createElement('td');
      if (typeof item[k] === 'object' && item[k] !== null) {
        if (Array.isArray(item[k])) {
          td.textContent = item[k].map(p => p.Name || p.Part_ID).join(', ') || 'None';
        } else {
          td.textContent = JSON.stringify(item[k]);
        }
      } else {
        td.textContent = item[k];
      }
      tr.appendChild(td);
    });
    bodyRow.appendChild(tr);
  });

  // Update tab counts
  document.querySelectorAll('.db-tab').forEach(tab => {
    const tbl = tab.dataset.table;
    if (appState[tbl]) {
      const labelName = tbl === 'Parts_Inventory' ? 'Inventory' : tbl === 'Electricians' ? 'Field Teams' : tbl;
      tab.textContent = `${labelName} (${appState[tbl].length})`;
    }
  });
}
