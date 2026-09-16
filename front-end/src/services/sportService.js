import { api } from '../utils/api';
import { db } from '../config/firebase';
import { collection, getDocs } from 'firebase/firestore';

export const DEFAULT_SPORTS = [
  {
    id: "sport-football",
    title: "5-a-Side & 7-a-Side Football",
    icon: "sports_soccer",
    tag: "FIFA Approved Turf",
    image: "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=800&q=80",
    description: "High-density 50mm FIFA artificial turf with shock-pad underlay designed for maximum traction and knee protection.",
    order: 1
  },
  {
    id: "sport-box-cricket",
    title: "High-Speed Box Cricket",
    icon: "sports_cricket",
    tag: "Enclosed Arena",
    image: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=800&q=80",
    description: "High-netting enclosed pitch with bounce-controlled turf for competitive box cricket matches and night tournaments.",
    order: 2
  },
  {
    id: "sport-futsal",
    title: "Fast-Paced Futsal",
    icon: "sports_football",
    tag: "Pro Boundary",
    image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80",
    description: "Compact, boundary-enclosed setup optimized for technical dribbling, quick passes, and high-intensity scrimmage.",
    order: 3
  },
  {
    id: "sport-turf-hockey",
    title: "Turf Hockey & Practice",
    icon: "sports_hockey",
    tag: "Precision Surface",
    image: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800&q=80",
    description: "Consistent ball-roll surface for field hockey practice sessions, passing drills, and mini tournament matches.",
    order: 4
  },
  {
    id: "sport-coaching-academies",
    title: "Coaching & Academies",
    icon: "sports",
    tag: "Morning & Evening",
    image: "https://images.unsplash.com/photo-1517649763962-0c623266010b?auto=format&fit=crop&w=800&q=80",
    description: "Dedicated slot reservations for youth football academies, sports academies, and professional fitness bootcamps.",
    order: 5
  },
  {
    id: "sport-private-matches-events",
    title: "Private Matches & Events",
    icon: "celebration",
    tag: "Lounge Reserved",
    image: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80",
    description: "Private arena reservations featuring changing lounge access, team seating, and tournament scorekeeping setup.",
    order: 6
  }
];

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
      return data.sort((a, b) => (a.order || 99) - (b.order || 99));
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
