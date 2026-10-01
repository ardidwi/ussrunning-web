import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

const stories = [
  ["ORIGIN / 001", "18 RUNNERS. DAY ONE.", "4 July 2024. Friends and family became the first starting line.", "https://images.unsplash.com/photo-1538805060514-97d9cc17730c?auto=format&fit=crop&w=1400&q=85"],
  ["COMMUNITY / 002", "DAY 365: AROUND 500 SHOWED UP.", "Recreational and serious runners, one year later.", "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1400&q=85"],
  ["CHEERING / 003", "THE PEOPLE OFF THE COURSE MATTER TOO.", "More than one hundred people showing up to carry the energy.", "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=1400&q=85"],
  ["RACE WEEK / 004", "THE START LINE IS ONLY PART OF THE STORY.", "Carb loading, race day, cheering and the celebration after.", "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1400&q=85"],
  ["FOOD / 005", "FUEL BEFORE THE START.", "Sit together, talk race plans, calm the nerves and get ready.", "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1400&q=85"],
  ["CULTURE / 006", "RUNNING IS THE ENTRY POINT.", "Movement connects us. Culture, people and shared experiences keep the story going.", "https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=1400&q=85"],
];

export default function StoriesPage() {
  return (
    <main className="page-black">
      <SiteHeader />

      <section className="page-hero crew-page-hero">
        <div className="content-frame">
          <span className="kicker">USS JOURNAL / PEOPLE / CITY / MILES</span>
          <h1>THE STORIES<br />AROUND THE RUN.</h1>
          <p>
            The run is one part of it. The people, meals, cheering, race-week
            nerves, collaborations and city moments are part of USS too.
          </p>
        </div>
      </section>

      <section className="stories-grid stories-grid-expanded section">
        {stories.map(([eyebrow, title, copy, image]) => (
          <article className="story-card" key={title}>
            <img src={image} alt="" />
            <span className="kicker">{eyebrow}</span>
            <h2>{title}</h2>
            <p>{copy}</p>
            <button>READ STORY ↗</button>
          </article>
        ))}
      </section>

      <SiteFooter />
    </main>
  );
}
