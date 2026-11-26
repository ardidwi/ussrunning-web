import { execFileSync } from "node:child_process";

const baseline = {
  "app/page.tsx": "c713131ac0df87f8703c2f6bfc958cd87c967dcb",
  "app/home-motion.css": "6da704c17b8b171d7cf427ecea4cab9b831c0e8a",
  "components/HomeMotionExperience.tsx": "8efabf1a6265e3f3124a3cb6ec55a76fd086ee88",
  "components/home/ParticleField.ts": "d4ef7e1b6cd140ed43fa97336eacefd405d854bf",
  "components/home/hero-motion.ts": "cb915c3f429fe9abeef01f712e36c657890cdc14",
  "components/home/particle-motion.ts": "b5cec5a3eba4734403157ba49753e359f81fdb77",
  "components/home/particle-targets.ts": "a822a80b448304de3599dd5b5bf4c448d02699ec",
  "public/monas-hero.svg": "b39ffcf02abf36163935b679e2c3ab666f7eac02",
};

const failures = [];

for (const [file, expected] of Object.entries(baseline)) {
  let actual;

  try {
    actual = execFileSync("git", ["hash-object", "--", file], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    failures.push(`${file}: missing or unreadable`);
    continue;
  }

  if (actual !== expected) {
    failures.push(`${file}: expected ${expected}, got ${actual}`);
  }
}

if (failures.length > 0) {
  console.error(
    [
      "Production homepage baseline changed.",
      "Future merges must preserve the approved homepage unless Ardi explicitly approves a homepage change.",
      "For an intentional approved homepage change, update the homepage implementation and this baseline together in one atomic PR.",
      "",
      ...failures.map((failure) => `- ${failure}`),
    ].join("\n"),
  );
  process.exit(1);
}

console.log(`Homepage baseline verified (${Object.keys(baseline).length} files).`);
