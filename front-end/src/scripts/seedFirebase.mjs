/**
 * Direct Firebase Firestore Seed Script for Alangudi Aadukalam
 * Project: deepak-f0ba9
 * 
 * Seeds:
 * 1. `sports` collection (The 6 "SPORTS & EVENTS WE HOST" cards)
 * 2. `events` collection (Showcase completed and upcoming tournament event cards)
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDWt3_QiLG5L429S-Ob5h9X4cNSTlNflhs",
  authDomain: "deepak-f0ba9.firebaseapp.com",
  projectId: "deepak-f0ba9",
  storageBucket: "deepak-f0ba9.firebasestorage.app",
  messagingSenderId: "881348615948",
  appId: "1:881348615948:web:75f46a797e4e8b2b6cf329"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

export const SPORTS_DATA = [
  {
    id: "sport-football",
    title: "5-a-Side & 7-a-Side Football",
    icon: "sports_soccer",
    tag: "FIFA Approved Turf",
    image: "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=800&q=80",
    description: "High-density 50mm FIFA artificial turf with shock-pad underlay designed for maximum traction and knee protection.",
    order: 1,
    category: "Football",
    isActive: true
  },
  {
    id: "sport-box-cricket",
    title: "High-Speed Box Cricket",
    icon: "sports_cricket",
    tag: "Enclosed Arena",
    image: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=800&q=80",
    description: "High-netting enclosed pitch with bounce-controlled turf for competitive box cricket matches and night tournaments.",
    order: 2,
    category: "Cricket",
    isActive: true
  },
  {
    id: "sport-futsal",
    title: "Fast-Paced Futsal",
    icon: "sports_football",
    tag: "Pro Boundary",
    image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80",
    description: "Compact, boundary-enclosed setup optimized for technical dribbling, quick passes, and high-intensity scrimmage.",
    order: 3,
    category: "Futsal",
    isActive: true
  },
  {
    id: "sport-turf-hockey",
    title: "Turf Hockey & Practice",
    icon: "sports_hockey",
    tag: "Precision Surface",
    image: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800&q=80",
    description: "Consistent ball-roll surface for field hockey practice sessions, passing drills, and mini tournament matches.",
    order: 4,
    category: "Hockey",
    isActive: true
  },
  {
    id: "sport-coaching-academies",
    title: "Coaching & Academies",
    icon: "sports",
    tag: "Morning & Evening",
    image: "https://images.unsplash.com/photo-1517649763962-0c623266010b?auto=format&fit=crop&w=800&q=80",
    description: "Dedicated slot reservations for youth football academies, sports academies, and professional fitness bootcamps.",
    order: 5,
    category: "Coaching",
    isActive: true
  },
  {
    id: "sport-private-matches-events",
    title: "Private Matches & Events",
    icon: "celebration",
    tag: "Lounge Reserved",
    image: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80",
    description: "Private arena reservations featuring changing lounge access, team seating, and tournament scorekeeping setup.",
    order: 6,
    category: "Private Events",
    isActive: true
  }
];

export const EVENTS_DATA = [
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
    image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=800",
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
    image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=1200",
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

export const seedFirebase = async () => {
  console.log('🚀 Starting Firebase Firestore seeding for project:', firebaseConfig.projectId);

  // 1. Seed Sports collection (SPORTS & EVENTS WE HOST)
  console.log('\n📦 Seeding "sports" collection...');
  for (const sport of SPORTS_DATA) {
    const docRef = doc(db, 'sports', sport.id);
    const payload = {
      ...sport,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await setDoc(docRef, payload, { merge: true });
    console.log(`  ✓ Seeded sport: [${sport.id}] ${sport.title}`);
  }

  // 2. Seed Events collection (Completed & Upcoming Events cards)
  console.log('\n🏆 Seeding "events" collection...');
  for (const evt of EVENTS_DATA) {
    const docRef = doc(db, 'events', evt.id);
    const payload = {
      ...evt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: new Date().toISOString()
    };
    await setDoc(docRef, payload, { merge: true });
    console.log(`  ✓ Seeded event: [${evt.id}] ${evt.title} (${evt.category})`);
  }

  // Verification count
  const sportsSnap = await getDocs(collection(db, 'sports'));
  const eventsSnap = await getDocs(collection(db, 'events'));

  console.log('\n🎉 Seeding completed successfully!');
  console.log(`📊 Firestore "sports" count: ${sportsSnap.size}`);
  console.log(`📊 Firestore "events" count: ${eventsSnap.size}`);
};

seedFirebase()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  });
