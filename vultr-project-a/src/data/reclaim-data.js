window.RECLAIM_DATA = {
  targetRecovery: 182400,
  documents: {
    "sla-tier": {
      title: "Northstar Telecom MSA - Service Level Exhibit",
      page: "Exhibit B, page 14",
      asset: "assets/clause-sla-tier.svg",
      excerpt: "If monthly availability falls below 99.9% and is at least 99.0%, customer receives a credit equal to 10% of the monthly recurring charge for the affected circuit."
    },
    "maintenance-notice": {
      title: "Northstar Telecom MSA - Maintenance Exclusions",
      page: "Section 7.3, page 19",
      asset: "assets/clause-maintenance-notice.svg",
      excerpt: "Scheduled maintenance is excluded only when carrier gives at least five business days of written notice and performs the work inside the approved window."
    },
    "claim-window": {
      title: "Northstar Telecom MSA - Credit Claim Procedure",
      page: "Section 9.1, page 22",
      asset: "assets/clause-claim-window.svg",
      excerpt: "Customer must submit service-credit claims within thirty calendar days after the end of the billing month."
    },
    "invoice-credit": {
      title: "Northstar Invoice Extract - BAN 77104",
      page: "June 2026 invoice, line 44",
      asset: "assets/clause-invoice-credit.svg",
      excerpt: "SLA service credit, circuit CKT-DEN-031, applied for June billing period."
    }
  },
  liveCases: [
    {
      id: "CKT-ATL-014",
      ban: "88321",
      store: "Atlanta Midtown",
      carrier: "Northstar Telecom",
      region: "Southeast",
      timezone: "America/New_York",
      invoiceMonth: "June 2026",
      mrc: 1240,
      periodMinutes: 43200,
      slaTarget: 99.9,
      claimDaysLeft: 3,
      route: "deep review",
      initialStatus: "ready",
      plannerHint: "1 scheduled-maintenance interval has no notice artifact. Billing history is complete.",
      intervals: [
        {
          ticket: "INC-10422",
          minutes: 87,
          tag: "scheduled maintenance",
          notice: "missing",
          notes: "Maintenance label present, but no 5-day pre-notice attached to the ticket."
        }
      ],
      invoiceHistory: [],
      retrievalMatch: 0.93,
      ambiguityResolution: 1,
      billingCertainty: 1
    },
    {
      id: "CKT-SEA-009",
      ban: "64018",
      store: "Seattle Ballard",
      carrier: "Northstar Telecom",
      region: "Northwest",
      timezone: "America/Los_Angeles",
      invoiceMonth: "June 2026",
      mrc: 38900,
      periodMinutes: 43200,
      slaTarget: 99.9,
      claimDaysLeft: 18,
      route: "clean",
      initialStatus: "ready",
      plannerHint: "Unplanned outage tag, complete invoices, no exclusion terms implicated.",
      intervals: [
        {
          ticket: "INC-09611",
          minutes: 64,
          tag: "unplanned outage",
          notice: "not applicable",
          notes: "Fiber cut confirmed by carrier NOC. No maintenance or customer-caused markers."
        }
      ],
      invoiceHistory: [],
      retrievalMatch: 0.91,
      ambiguityResolution: 1,
      billingCertainty: 1
    },
    {
      id: "CKT-DEN-031",
      ban: "77104",
      store: "Denver Cherry Creek",
      carrier: "Northstar Telecom",
      region: "Mountain",
      timezone: "America/Denver",
      invoiceMonth: "June 2026",
      mrc: 18400,
      periodMinutes: 43200,
      slaTarget: 99.9,
      claimDaysLeft: 11,
      route: "already credited",
      initialStatus: "ready",
      plannerHint: "Outage breached SLA, but invoice summary shows a prior June SLA credit.",
      intervals: [
        {
          ticket: "INC-10102",
          minutes: 102,
          tag: "unplanned outage",
          notice: "not applicable",
          notes: "Access aggregation outage acknowledged by carrier incident report."
        }
      ],
      invoiceHistory: [
        {
          amount: 1840,
          reason: "SLA service credit",
          invoiceLine: "June invoice line 44"
        }
      ],
      retrievalMatch: 0.89,
      ambiguityResolution: 1,
      billingCertainty: 1
    },
    {
      id: "CKT-PHX-022",
      ban: "55290",
      store: "Phoenix Camelback",
      carrier: "Northstar Telecom",
      region: "Southwest",
      timezone: "America/Phoenix",
      invoiceMonth: "June 2026",
      mrc: 61200,
      periodMinutes: 43200,
      slaTarget: 99.9,
      claimDaysLeft: 3,
      route: "deadline",
      initialStatus: "ready",
      plannerHint: "Clean SLA breach with claim window closing in 3 days.",
      intervals: [
        {
          ticket: "INC-10371",
          minutes: 79,
          tag: "unplanned outage",
          notice: "not applicable",
          notes: "Core router failure, no exclusion markers."
        }
      ],
      invoiceHistory: [],
      retrievalMatch: 0.88,
      ambiguityResolution: 1,
      billingCertainty: 1
    },
    {
      id: "CKT-MIA-020",
      ban: "44817",
      store: "Miami Brickell",
      carrier: "Northstar Telecom",
      region: "Southeast",
      timezone: "America/New_York",
      invoiceMonth: "June 2026",
      mrc: 21600,
      periodMinutes: 43200,
      slaTarget: 99.9,
      claimDaysLeft: 16,
      route: "excluded",
      initialStatus: "ready",
      plannerHint: "Maintenance tag includes a customer-approved work order.",
      intervals: [
        {
          ticket: "INC-09988",
          minutes: 141,
          tag: "scheduled maintenance",
          notice: "customer approved",
          notes: "Customer approval CRQ-4417 attached. Work completed inside the approved window."
        }
      ],
      invoiceHistory: [],
      retrievalMatch: 0.87,
      ambiguityResolution: 1,
      billingCertainty: 1
    },
    {
      id: "CKT-BOS-018",
      ban: "90812",
      store: "Boston Seaport",
      carrier: "Northstar Telecom",
      region: "Northeast",
      timezone: "America/New_York",
      invoiceMonth: "June 2026",
      mrc: 47200,
      periodMinutes: 43200,
      slaTarget: 99.9,
      claimDaysLeft: 9,
      route: "needs review",
      initialStatus: "ready",
      plannerHint: "Ticket notes conflict with invoice export; route to human review.",
      intervals: [
        {
          ticket: "INC-10015",
          minutes: 55,
          tag: "customer-caused",
          notice: "unclear",
          notes: "NOC marks customer power, store log says carrier handoff was down."
        }
      ],
      invoiceHistory: [],
      retrievalMatch: 0.71,
      ambiguityResolution: 0,
      billingCertainty: 0.5
    }
  ],
  portfolioRows: [
    ["CKT-NYC-044", "19902", "New York Herald Sq", "deadline", 22800],
    ["CKT-CHI-038", "25518", "Chicago Loop", "credit owed", 17600],
    ["CKT-LAX-017", "31170", "Los Angeles Fairfax", "credit owed", 16400],
    ["CKT-DAL-027", "41890", "Dallas Knox", "credit owed", 15200],
    ["CKT-SFO-011", "88140", "San Francisco Union", "deep review", 14800],
    ["CKT-AUS-006", "50731", "Austin Lamar", "credit owed", 13700],
    ["CKT-PDX-015", "77892", "Portland Pearl", "credit owed", 12300],
    ["CKT-MSP-010", "71990", "Minneapolis North", "already credited", 0],
    ["CKT-RDU-032", "61907", "Raleigh Cameron", "credit owed", 9700],
    ["CKT-ORL-013", "37190", "Orlando Park", "credit owed", 9100],
    ["CKT-SLC-005", "66011", "Salt Lake Central", "needs review", 0],
    ["CKT-SAN-008", "43310", "San Diego Mission", "credit owed", 8300],
    ["CKT-CLT-039", "98311", "Charlotte Tryon", "credit owed", 7900],
    ["CKT-DET-029", "99018", "Detroit Midtown", "credit owed", 7600],
    ["CKT-NASH-021", "27290", "Nashville Green", "credit owed", 6900],
    ["CKT-CMH-036", "55010", "Columbus Easton", "excluded", 0],
    ["CKT-SAT-004", "47300", "San Antonio River", "credit owed", 6400],
    ["CKT-PIT-012", "12871", "Pittsburgh Strip", "credit owed", 5800],
    ["CKT-LV-003", "81908", "Las Vegas Summerlin", "credit owed", 5200],
    ["CKT-KC-016", "73829", "Kansas City Plaza", "credit owed", 4800],
    ["CKT-IND-023", "89102", "Indianapolis North", "clean", 0],
    ["CKT-CLE-034", "36444", "Cleveland West", "credit owed", 4500],
    ["CKT-MKE-028", "74820", "Milwaukee Third Ward", "credit owed", 4200],
    ["CKT-RIC-019", "31808", "Richmond Short Pump", "credit owed", 3900],
    ["CKT-OMA-026", "64091", "Omaha Westroads", "credit owed", 3500],
    ["CKT-TUL-025", "54019", "Tulsa Woodland", "clean", 0],
    ["CKT-BOI-030", "11908", "Boise Towne", "credit owed", 3200],
    ["CKT-MEM-035", "20391", "Memphis Poplar", "credit owed", 3000],
    ["CKT-NOLA-041", "63392", "New Orleans Canal", "credit owed", 2800],
    ["CKT-HOU-033", "17290", "Houston Galleria", "deep review", 2600],
    ["CKT-CIN-024", "93111", "Cincinnati Hyde", "credit owed", 2400],
    ["CKT-ABQ-037", "70291", "Albuquerque Uptown", "credit owed", 2200],
    ["CKT-TUC-040", "60201", "Tucson Foothills", "clean", 0],
    ["CKT-OKC-045", "41098", "Oklahoma City Penn", "credit owed", 1800],
    ["CKT-JAX-046", "76019", "Jacksonville Town", "credit owed", 1700],
    ["CKT-BUF-047", "18290", "Buffalo Elmwood", "credit owed", 1500],
    ["CKT-FRES-048", "31099", "Fresno River", "excluded", 0]
  ]
};
