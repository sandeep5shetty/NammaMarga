export const BANGALORE_WARDS = [
  { number: 1, name: "Hebbal", zone: "North", latitude: 13.0358, longitude: 77.597 },
  { number: 2, name: "Yelahanka", zone: "North", latitude: 13.1007, longitude: 77.5963 },
  { number: 3, name: "Malleswaram", zone: "Central", latitude: 13.0035, longitude: 77.5647 },
  { number: 4, name: "Rajajinagar", zone: "West", latitude: 12.9915, longitude: 77.5494 },
  { number: 5, name: "Vijayanagar", zone: "West", latitude: 12.9716, longitude: 77.5373 },
  { number: 6, name: "Basavanagudi", zone: "South", latitude: 12.942, longitude: 77.573 },
  { number: 7, name: "Jayanagar", zone: "South", latitude: 12.925, longitude: 77.5938 },
  { number: 8, name: "BTM Layout", zone: "South", latitude: 12.9166, longitude: 77.6101 },
  { number: 9, name: "Koramangala", zone: "South-East", latitude: 12.9279, longitude: 77.6271 },
  { number: 10, name: "Indiranagar", zone: "East", latitude: 12.9784, longitude: 77.6408 },
  { number: 11, name: "Whitefield", zone: "East", latitude: 12.9698, longitude: 77.7499 },
  { number: 12, name: "Mahadevapura", zone: "East", latitude: 12.9912, longitude: 77.6885 },
  { number: 13, name: "Shivajinagar", zone: "Central", latitude: 12.9855, longitude: 77.6033 },
  { number: 14, name: "Chamarajpet", zone: "Central", latitude: 12.9591, longitude: 77.566 },
  { number: 15, name: "Electronic City", zone: "South", latitude: 12.8399, longitude: 77.677 },
] as const;

export function findNearestWard(lat: number, lng: number) {
  type Ward = (typeof BANGALORE_WARDS)[number];
  let nearest: Ward = BANGALORE_WARDS[0];
  let minDist = Infinity;

  for (const ward of BANGALORE_WARDS) {
    const d = (ward.latitude - lat) ** 2 + (ward.longitude - lng) ** 2;
    if (d < minDist) {
      minDist = d;
      nearest = ward;
    }
  }

  return nearest;
}
