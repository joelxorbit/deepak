import { initializeFirebase, getDb } from '../config/firebase.js';
import { getSportsCollection, getEventsCollection } from '../config/firestoreCollections.js';
import { logger } from '../utils/logger.js';
import { fileURLToPath } from 'url';

export const INITIAL_SPORTS = [
  {
    id: "sport-cricket",
    title: "Cricket",
    icon: "sports_cricket",
    tag: "Enclosed Arena",
    image: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=800&q=80",
    description: "High-netting enclosed pitch with bounce-controlled turf for competitive box cricket matches, tournaments, and practice.",
    order: 1,
    category: "Cricket",
    isActive: true
  },
  {
    id: "sport-football",
    title: "Football",
    icon: "sports_soccer",
    tag: "FIFA Approved Turf",
    image: "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=800&q=80",
    description: "High-density 50mm FIFA artificial turf with shock-pad underlay designed for maximum traction and knee protection.",
    order: 2,
    category: "Football",
    isActive: true
  },
  {
    id: "sport-throwball",
    title: "Throwball",
    icon: "sports_volleyball",
    tag: "Multi-Sport Pitch",
    image: "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=800&q=80",
    description: "Dedicated court markings and high-tension boundary netting optimized for high-energy throwball matches and practice sessions.",
    order: 3,
    category: "Throwball",
    isActive: true
  },
  {
    id: "sport-birthday-parties",
    title: "Birthday Parties",
    icon: "celebration",
    tag: "Celebration Zone",
    image: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=800&q=80",
    description: "Celebrate action-packed birthdays with mini tournaments, customized turf party games, and full arena access.",
    order: 4,
    category: "Parties",
    isActive: true
  },
  {
    id: "sport-corporate-events",
    title: "Corporate Events",
    icon: "groups",
    tag: "Team Building",
    image: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80",
    description: "Ideal venue for corporate leagues, annual sports meets, team-building activities, and employee engagement tournaments.",
    order: 5,
    category: "Corporate",
    isActive: true
  },
  {
    id: "sport-kindergarten-graduations",
    title: "Kindergarten Graduations",
    icon: "school",
    tag: "School Celebrations",
    image: "https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=800&q=80",
    description: "A safe, spacious, and open arena for kindergarten convocation ceremonies, family celebrations, and memorable photo shoots.",
    order: 6,
    category: "School Events",
    isActive: true
  }
];

export const INITIAL_EVENTS = [
  {
    id: "evt-01",
    title: "Birthday Football Party",
    category: "PARTY",
    date: "2024-05-12",
    startTime: "16:00",
    endTime: "19:00",
    venue: "Main Arena (FIFA-Grade Turf)",
    description: "Celebrated Alex's 12th birthday with a 5-a-side mini tournament, customized jerseys, and penalty shootout competition.",
    image: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80",
    status: "Completed",
    isPublished: true,
    isArchived: false,
    isDeleted: false,
    registrationStatus: "CLOSED"
  },
  {
    id: "evt-02",
    title: "Weekend Match Showdown",
    category: "FRIENDLY",
    date: "2024-05-18",
    startTime: "19:00",
    endTime: "22:00",
    venue: "Main Arena (FIFA-Grade Turf)",
    description: "High-intensity weekend showdown under floodlights between Northside Strikers and Southside FC.",
    image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800",
    status: "Completed",
    isPublished: true,
    isArchived: false,
    isDeleted: false,
    registrationStatus: "CLOSED"
  },
  {
    id: "evt-03",
    title: "Corporate Championship Tournament",
    category: "TOURNAMENT",
    date: "2024-06-01",
    startTime: "09:00",
    endTime: "18:00",
    venue: "Main Arena (FIFA-Grade Turf)",
    description: "16 corporate tech teams competed in our annual Championship Cup with live scoring and gold trophy presentation.",
    image: "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=800&q=80",
    status: "Completed",
    isPublished: true,
    isArchived: false,
    isDeleted: false,
    registrationStatus: "CLOSED"
  },
  {
    id: "evt-04",
    title: "School Sports Premier Event",
    category: "SCHOOL",
    date: "2024-06-10",
    startTime: "08:00",
    endTime: "14:00",
    venue: "Main Arena (FIFA-Grade Turf)",
    description: "Annual inter-school football Championship hosted on our FIFA-grade turf with over 200 student participants.",
    image: "https://images.unsplash.com/photo-1517649763962-0c623266010b?auto=format&fit=crop&w=800&q=80",
    status: "Completed",
    isPublished: true,
    isArchived: false,
    isDeleted: false,
    registrationStatus: "CLOSED"
  },
  {
    id: "evt-05",
    title: "Community Midnight Scrimmage",
    category: "COMMUNITY",
    date: "2024-06-15",
    startTime: "22:00",
    endTime: "01:00",
    venue: "Main Arena (FIFA-Grade Turf)",
    description: "Community midnight scrimmage featuring local football enthusiasts, club athletes, and friendly penalty shootouts.",
    image: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=800&q=80",
    status: "Completed",
    isPublished: true,
    isArchived: false,
    isDeleted: false,
    registrationStatus: "CLOSED"
  },
  {
    id: "evt-upcoming-01",
    title: "Aadukalam Super League 2026",
    category: "Upcoming",
    date: "2026-10-15",
    startTime: "18:00",
    endTime: "22:00",
    venue: "Main Arena (FIFA-Grade Turf)",
    description: "Registration now open for the premier 5v5 floodlight football tournament. 16 squads, trophies, cash prizes, and pro commentary.",
    image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200",
    status: "Upcoming",
    isPublished: true,
    isArchived: false,
    isDeleted: false,
    registrationStatus: "OPEN",
    contactPhone: "9876543210"
  },
  {
    id: "evt-upcoming-02",
    title: "Inter-Corporate Box Cricket Cup",
    category: "Upcoming",
    date: "2026-11-05",
    startTime: "09:00",
    endTime: "18:00",
    venue: "Enclosed Cricket Arena",
    description: "High-octane corporate box cricket tournament. 8 overs per side with live ball-tracking, awards ceremony, and refreshments.",
    image: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=800&q=80",
    status: "Upcoming",
    isPublished: true,
    isArchived: false,
    isDeleted: false,
    registrationStatus: "OPEN",
    contactPhone: "9876543210"
  }
];

export const seedSportsAndEvents = async () => {
  logger.info('[SeedSportsAndEvents] Starting seed process...');
  try {
    initializeFirebase();
    const sportsCol = getSportsCollection();
    const eventsCol = getEventsCollection();

    // 1. Seed Sports
    for (const sport of INITIAL_SPORTS) {
      const docRef = sportsCol.doc(sport.id);
      const snap = await docRef.get();
      if (!snap.exists) {
        await docRef.set({
          ...sport,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        logger.info(`[SeedSports] Added sport: ${sport.title} (${sport.id})`);
      } else {
        logger.info(`[SeedSports] Sport exists: ${sport.id}`);
      }
    }

    // 2. Seed Events
    for (const evt of INITIAL_EVENTS) {
      const docRef = eventsCol.doc(evt.id);
      const snap = await docRef.get();
      if (!snap.exists) {
        await docRef.set({
          ...evt,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          publishedAt: new Date().toISOString()
        });
        logger.info(`[SeedEvents] Added event: ${evt.title} (${evt.id})`);
      } else {
        logger.info(`[SeedEvents] Event exists: ${evt.id}`);
      }
    }

    logger.info('[SeedSportsAndEvents] Seeding completed successfully!');
    return { success: true };
  } catch (err) {
    logger.error(`[SeedSportsAndEvents Error] ${err.message}`);
    throw err;
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedSportsAndEvents()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
