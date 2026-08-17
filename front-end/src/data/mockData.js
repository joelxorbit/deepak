// Initial Mock Data for Elite Pitch

export const INITIAL_COMPLETED_EVENTS = [
  {
    id: "evt-01",
    title: "Birthday Football Party",
    category: "PARTY",
    date: "2024-05-12",
    description: "Celebrated Alex's 12th birthday with a 5-a-side mini tournament, customized jerseys, and penalty shootout competition.",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBVPAuPTvY_bSmysoOcKNyrqK3Dj0LB4r4ITw-P9-m3nQfsgJJJCrlBM2wzz0TFvtpA1DWcv2qE5Ff1TtDLBRAMxcySYE-rg8Y5aTZ1rowDq1gT3hMHAlhwUUDd5XkgKmzq_Ig3GlEuJi5tcVeQnogXD1vqzX_RCrswo43tFP4T8toU5LTc0X8DRk2KoniWK2PbCzNI634aCdUXC-6cY5fQbFwggWzfn5BI7PVMSaGJq38yQmXmndKLWw",
    status: "Completed"
  },
  {
    id: "evt-02",
    title: "Weekend Match",
    category: "FRIENDLY",
    date: "2024-05-18",
    description: "High-intensity weekend showdown under floodlights between Northside Strikers and Southside FC.",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAM4HjiO5u87pKZFSm2tta_PH8B2_nJWL2AuVsD3XTjzi-7U2q7YFo4uoKw5IQxXeMz6noN9GyFAAIq3x9HM_kWmIVczR3NE9RSrWVuD53yJSOBf0z6Nyl1smkz5hHbJii8kJvU5bPbpt4XioVlawI-kepINZUFQXMX4KMBD88dCValI9Rz1f3kgDfoIGYCcmb88NHX6rU4mWgp6A9EYkY5TlwbNjtfII3k8zsMVgoka44X62Fz064oag",
    status: "Completed"
  },
  {
    id: "evt-03",
    title: "Corporate Tournament",
    category: "TOURNAMENT",
    date: "2024-06-01",
    description: "16 tech companies competed in our annual Corporate Championship Cup. TechCorp took home the gold trophy.",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuB86XbRLPti-5LWlAYzGO9KQrkyXJWAjDfgHxoq3lZCn0Y9ju02S2AztwzAobXmyGj_s1GYwUJg2KOWkSFGYaHuF3Qdl3j_BaRe1rcN6HbWqwnWhS6MNV4k91hL2NCkb6SM1EilTrLveITdm6DYMNZo155RXDgHJ9j2sIUYglXVBudtFYQFh5teXhKB-G2lljASq8_6sUtq9twgXxI4_DGnND4J5aCX4ttXXMdjj6TeXtNCFWdzVRfqsw",
    status: "Completed"
  },
  {
    id: "evt-04",
    title: "School Sports Event",
    category: "SCHOOL",
    date: "2024-06-10",
    description: "Annual inter-school football Championship hosted on our FIFA-grade turf with over 200 student participants.",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAXnn5j3ELBZ9E2oyXq7qVWS0omnWwwyx3mBUA-2Ha4NtH7XlYxquD3RJLMlekQTnQS4uDXN_WPV1hcTgxiMP_aS92iQ4YnL84t-VSTKNhr3rPaSh0zcezJ2w-d0XqZnXRLeL0ES12I5VjJ8yhgdsVMHpJXmtYZEQ_mvhAoUMiVyQtB3WgjpjfTCRMkedijOmZgePzLVidC1pBP7jq2Jn-2wwTVrzPlwRGCHILynwUzfZZPYNGiL2T-DQ",
    status: "Completed"
  },
  {
    id: "evt-05",
    title: "Friendly Match",
    category: "COMMUNITY",
    date: "2024-06-15",
    description: "Community midnight scrimmage featuring local football enthusiasts and youth club players.",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDyjY8SyG36ClfurIhvlx-1Wqzu6ENAavtdqMEZ9rTrtrV3Rwft35Eh3lHGRPQFoO-8WLpLy1GqUPHlVx-Ngy89yaDLR0bq81VsXkVfaSX974IKq86__cY3bWXGZtiS4cZvZT3Tq9KoaRbQelSmmr5sjO_8oNDoeMpsvNTa7EsINm67vIB5F1mec1AJCNcQaIN-EvDvm46IfXpv3kY7XiwiY_d9-AsBdzg3BNvhdB4sanK_YfFda4bdug",
    status: "Completed"
  }
];

export const INITIAL_BOOKINGS = [
  {
    id: "BK-20260802-0001",
    customerName: "Marcous Sterling",
    mobileNumber: "9876543210",
    date: new Date().toISOString().split('T')[0],
    slots: ["07:00 PM - 08:00 PM", "08:00 PM - 09:00 PM"],
    paymentMethod: "Pay Now",
    status: "Confirmed",
    createdAt: new Date().toISOString()
  },
  {
    id: "BK-20260802-0002",
    customerName: "Sarah Chen",
    mobileNumber: "9123456789",
    date: new Date().toISOString().split('T')[0],
    slots: ["09:00 PM - 10:00 PM"],
    paymentMethod: "Pay at Spot",
    status: "Pending Approval",
    createdAt: new Date().toISOString()
  },
  {
    id: "BK-20260801-0003",
    customerName: "David Miller",
    mobileNumber: "9988776655",
    date: "2026-08-01",
    slots: ["06:00 PM - 07:00 PM"],
    paymentMethod: "Pay Now",
    status: "Completed",
    createdAt: "2026-08-01T10:00:00.000Z"
  }
];

export const INITIAL_CUSTOMERS = [
  { id: "c-1", name: "Marcous Sterling", phone: "9876543210", totalBookings: 5 },
  { id: "c-2", name: "Sarah Chen", phone: "9123456789", totalBookings: 2 },
  { id: "c-3", name: "David Miller", phone: "9988776655", totalBookings: 8 }
];
