import { api } from '../utils/api';
import { db } from '../config/firebase';
import { collection, getDocs } from 'firebase/firestore';

export const DEFAULT_SPORTS = [
  {
    id: "sport-cricket",
    title: "Cricket",
    icon: "sports_cricket",
    tag: "Enclosed Arena",
    image: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=800&q=80",
    description: "High-netting enclosed pitch with bounce-controlled turf for competitive box cricket matches, tournaments, and practice.",
    order: 1
  },
  {
    id: "sport-football",
    title: "Football",
    icon: "sports_soccer",
    tag: "FIFA Approved Turf",
    image: "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=800&q=80",
    description: "High-density 50mm FIFA artificial turf with shock-pad underlay designed for maximum traction and knee protection.",
    order: 2
  },
  {
    id: "sport-throwball",
    title: "Throwball",
    icon: "sports_volleyball",
    tag: "Multi-Sport Pitch",
    image: "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=800&q=80",
    description: "Dedicated court markings and high-tension boundary netting optimized for high-energy throwball matches and practice sessions.",
    order: 3
  },
  {
    id: "sport-birthday-parties",
    title: "Birthday Parties",
    icon: "celebration",
    tag: "Celebration Zone",
    image: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=800&q=80",
    description: "Celebrate action-packed birthdays with mini tournaments, customized turf party games, and full arena access.",
    order: 4
  },
  {
    id: "sport-corporate-events",
    title: "Corporate Events",
    icon: "groups",
    tag: "Team Building",
    image: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80",
    description: "Ideal venue for corporate leagues, annual sports meets, team-building activities, and employee engagement tournaments.",
    order: 5
  },
  {
    id: "sport-kindergarten-graduations",
    title: "Kindergarten Graduations",
    icon: "school",
    tag: "School Celebrations",
    image: "https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=800&q=80",
    description: "A safe, spacious, and open arena for kindergarten convocation ceremonies, family celebrations, and memorable photo shoots.",
    order: 6
  }
];

const SPORT_MAPPINGS = {
  "5-a-side & 7-a-side football": {
    title: "Cricket",
    icon: "sports_cricket",
    tag: "Enclosed Arena",
    image: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=800&q=80",
    description: "High-netting enclosed pitch with bounce-controlled turf for competitive box cricket matches, tournaments, and practice.",
    order: 1
  },
  "high-speed box cricket": {
    title: "Football",
    icon: "sports_soccer",
    tag: "FIFA Approved Turf",
    image: "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=800&q=80",
    description: "High-density 50mm FIFA artificial turf with shock-pad underlay designed for maximum traction and knee protection.",
    order: 2
  },
  "fast-paced futsal": {
    title: "Throwball",
    icon: "sports_volleyball",
    tag: "Multi-Sport Pitch",
    image: "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=800&q=80",
    description: "Dedicated court markings and high-tension boundary netting optimized for high-energy throwball matches and practice sessions.",
    order: 3
  },
  "turf hockey & practice": {
    title: "Birthday Parties",
    icon: "celebration",
    tag: "Celebration Zone",
    image: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=800&q=80",
    description: "Celebrate action-packed birthdays with mini tournaments, customized turf party games, and full arena access.",
    order: 4
  },
  "coaching & academies": {
    title: "Corporate Events",
    icon: "groups",
    tag: "Team Building",
    image: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80",
    description: "Ideal venue for corporate leagues, annual sports meets, team-building activities, and employee engagement tournaments.",
    order: 5
  },
  "private matches & events": {
    title: "Kindergarten Graduations",
    icon: "school",
    tag: "School Celebrations",
    image: "https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=800&q=80",
    description: "A safe, spacious, and open arena for kindergarten convocation ceremonies, family celebrations, and memorable photo shoots.",
    order: 6
  }
};

const normalizeSport = (sport) => {
  const key = (sport.title || '').trim().toLowerCase();
  if (SPORT_MAPPINGS[key]) {
    return { ...sport, ...SPORT_MAPPINGS[key] };
  }
  return sport;
};

/**
 * Get all sports and hosted activities for the arena showcase.
 * Priority:
 * 1. Backend REST API (/api/sports)
 * 2. Direct Firebase Cloud Firestore (collection: 'sports')
 * 3. Graceful fallback
 */
export const getSportsService = async () => {
  // Layer 1: Attempt Backend API
  try {
    const response = await api.get('/sports');
    const data = response.data?.data;
    if (Array.isArray(data) && data.length > 0) {
      return data.map(normalizeSport).sort((a, b) => (a.order || 99) - (b.order || 99));
    }
  } catch (apiErr) {
    console.debug('[SportService] Backend API not reachable or empty, checking Firebase Firestore directly...', apiErr.message);
  }

  // Layer 2: Direct Firebase Cloud Firestore Client query
  try {
    const snapshot = await getDocs(collection(db, 'sports'));
    if (!snapshot.empty) {
      const sports = snapshot.docs
        .map(doc => ({ id: doc.id, _id: doc.id, ...doc.data() }))
        .filter(s => !s.isDeleted && s.isActive !== false)
        .map(normalizeSport)
        .sort((a, b) => (a.order || 99) - (b.order || 99));

      if (sports.length > 0) {
        return sports;
      }
    }
  } catch (firestoreErr) {
    console.warn('[SportService] Firestore direct read error:', firestoreErr.message);
  }

  // Layer 3: Default initial fallback
  return DEFAULT_SPORTS;
};
