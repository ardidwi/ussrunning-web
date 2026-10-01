export type Run = {
  slug: string;
  eyebrow: string;
  title: string;
  date: string;
  time: string;
  location: string;
  distance: string;
  status: string;
  image: string;
};

export const runs: Run[] = [
  {
    slug: "night-shift",
    eyebrow: "COMMUNITY RUN 01",
    title: "NIGHT SHIFT",
    date: "03 OCT 2026",
    time: "05:30",
    location: "BLOK M, JAKARTA",
    distance: "5K SOCIAL RUN",
    status: "RSVP OPEN",
    image: "https://images.unsplash.com/photo-1538805060514-97d9cc17730c?auto=format&fit=crop&w=1600&q=85",
  },
  {
    slug: "dawn-patrol",
    eyebrow: "COMMUNITY RUN 02",
    title: "DAWN PATROL",
    date: "17 OCT 2026",
    time: "05:15",
    location: "GBK, JAKARTA",
    distance: "8K EASY",
    status: "MEMBER ACCESS",
    image: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1600&q=85",
  },
  {
    slug: "city-relay",
    eyebrow: "SPECIAL SESSION",
    title: "CITY RELAY",
    date: "31 OCT 2026",
    time: "18:30",
    location: "SUDIRMAN, JAKARTA",
    distance: "4 × 2.5K",
    status: "COMING SOON",
    image: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=1600&q=85",
  },
];

export const stats = [
  { value: "18", label: "RUNNERS ON DAY ONE" },
  { value: "500+", label: "RUNNERS AT YEAR ONE" },
  { value: "10M+", label: "SOCIAL VIEWS" },
  { value: "JKT", label: "BUILT IN THE CITY" },
];
