import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

const stories = [
  ["FIELD NOTES / 001","WHY WE KEEP COMING BACK TO THE ROAD.","https://images.unsplash.com/photo-1538805060514-97d9cc17730c?auto=format&fit=crop&w=1400&q=85"],
  ["COMMUNITY / 002","FROM 18 RUNNERS TO A CITY IN MOTION.","https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1400&q=85"],
  ["RACE WEEK / 003","THE START LINE IS ONLY PART OF THE STORY.","https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=1400&q=85"]
];

export default function StoriesPage() {
  return (
    <main className="page-black">
      <SiteHeader />
      <section className="page-hero">
        <span className="kicker">USS JOURNAL</span>
        <h1>STORIES FROM<br />THE ROAD.</h1>
        <p>People, movement, race week and everything that happens before and after the run.</p>
      </section>
      <section className="stories-grid section">
        {stories.map(([eyebrow,title,image]) => (
          <article className="story-card" key={title}>
            <img src={image} alt="" />
            <span className="kicker">{eyebrow}</span>
            <h2>{title}</h2>
            <button>READ STORY ↗</button>
          </article>
        ))}
      </section>
      <SiteFooter />
    </main>
  );
}
