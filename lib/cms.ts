import { runs } from "@/data/site";
export type Role = "super_admin" | "admin" | "member";
export const roleLabels: Record<Role, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  member: "Member",
};
export const permissions = {
  content: ["super_admin", "admin"],
  users: ["super_admin"],
  profile: ["super_admin", "admin", "member"],
} satisfies Record<string, Role[]>;
export function can(role: Role, action: keyof typeof permissions) {
  return (permissions[action] as Role[]).includes(role);
}
export type Account = {
  id: string;
  memberId: string;
  barcode: string;
  name: string;
  role: Role;
};
export type Story = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  category: string;
  author: string;
  cover: string;
  status: "draft" | "published" | "archived";
  featured: boolean;
  publishedAt: string | null;
};
export type Media = {
  id: string;
  url: string;
  caption: string;
  visible: boolean;
};
export type EventRecord = {
  id: string;
  title: string;
  date: string;
  location: string;
  capacity: number;
  open: boolean;
};
export type SiteContent = {
  headline: string;
  description: string;
  desktop: string;
  mobile: string;
  focus: number;
  overlay: number;
  loginBackground: string;
  footer: string;
};
export type CmsState = {
  version: 1;
  accounts: Account[];
  stories: Story[];
  gallery: Media[];
  events: EventRecord[];
  draft: SiteContent;
  published: SiteContent;
  activity: { id: string; actor: string; action: string; at: string }[];
};
export const initialContent: SiteContent = {
  headline: "WE RUN.\nWE CONNECT.\nWE MOVE.",
  description:
    "Built in Jakarta. USS Running brings people together through movement, then keeps the story going through culture, friendship and shared experiences.",
  desktop: runs[0].image,
  mobile: runs[0].image,
  focus: 50,
  overlay: 55,
  loginBackground: runs[0].image,
  footer: "USS Running · Community in motion",
};
export function newAccount(name: string, role: Role = "member"): Account {
  const id = crypto.randomUUID();
  return {
    id,
    memberId: "USS-" + id.toUpperCase(),
    barcode: "USS-" + id.toUpperCase(),
    name,
    role,
  };
}
export function seed(): CmsState {
  return {
    version: 1,
    accounts: [],
    stories: [],
    gallery: [],
    events: runs.map((r) => ({
      id: r.slug,
      title: r.title,
      date: r.date,
      location: r.location,
      capacity: 0,
      open: false,
    })),
    draft: { ...initialContent },
    published: { ...initialContent },
    activity: [],
  };
}
export const STORAGE_KEY = "uss-cms-demo-v1";
export function validImage(url: string) {
  if (!url) return true;
  return (
    /^data:image\/(png|jpeg|webp);base64,/.test(url) ||
    /^\/(?!\/)/.test(url) ||
    /^https:\/\//.test(url)
  );
}
// Code 39, narrow:wide ratio 1:3. UUID alphabet plus USS prefix; '*' is start/stop only.
const patterns: Record<string, number> = {
  "0": 0x034,
  "1": 0x121,
  "2": 0x061,
  "3": 0x160,
  "4": 0x031,
  "5": 0x130,
  "6": 0x070,
  "7": 0x025,
  "8": 0x124,
  "9": 0x064,
  A: 0x109,
  B: 0x049,
  C: 0x148,
  D: 0x019,
  E: 0x118,
  F: 0x058,
  S: 0x046,
  U: 0x181,
  "-": 0x085,
  "*": 0x094,
};
export function barcodeGeometry(value: string) {
  let x = 16;
  const bars: { x: number; width: number }[] = [];
  for (const ch of "*" + value + "*") {
    if (patterns[ch] === undefined)
      throw new Error("Unsupported Code 39 character");
    for (let i = 0; i < 9; i++) {
      const width = patterns[ch] & (1 << (8 - i)) ? 3 : 1;
      if (i % 2 === 0) bars.push({ x, width });
      x += width;
    }
    x += 1;
  }
  return { bars, width: x + 16 };
}
export function barcodeSvg(value: string) {
  const { bars, width } = barcodeGeometry(value);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 100"><rect width="${width}" height="100" fill="white"/>${bars.map((b) => `<rect x="${b.x}" y="10" width="${b.width}" height="80" fill="black"/>`).join("")}</svg>`;
}
