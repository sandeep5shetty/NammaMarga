export type GeocodeResult = {
  id: string;
  name: string;
  placeName: string;
  latitude: number;
  longitude: number;
};

const BANGALORE_BBOX = "77.42,12.75,77.85,13.15";
const BANGALORE_PROXIMITY = "77.5946,12.9716";

export async function searchPlaces(query: string, limit = 6): Promise<GeocodeResult[]> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token || query.trim().length < 2) return [];

  const encoded = encodeURIComponent(query.trim());
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json` +
    `?access_token=${token}` +
    `&country=in` +
    `&proximity=${BANGALORE_PROXIMITY}` +
    `&bbox=${BANGALORE_BBOX}` +
    `&limit=${limit}` +
    `&types=place,locality,neighborhood,address,poi`;

  const res = await fetch(url);
  if (!res.ok) return [];

  const data = await res.json();
  const features = data.features ?? [];

  return features.map(
    (f: {
      id: string;
      place_name: string;
      text: string;
      center: [number, number];
    }) => ({
      id: f.id,
      name: f.text,
      placeName: f.place_name,
      longitude: f.center[0],
      latitude: f.center[1],
    }),
  );
}
