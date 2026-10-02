"use client";
import { useDemo } from "./DemoProvider";
import { validImage } from "@/lib/cms";
import Link from "next/link";
export function HomeMedia() {
  const { state } = useDemo();
  const c = state.published;
  return (
    <>
      <div className="hero-media" aria-hidden="true">
        <picture>
          <source
            media="(max-width: 700px)"
            srcSet={validImage(c.mobile) ? c.mobile : undefined}
          />
          <img
            src={validImage(c.desktop) ? c.desktop : undefined}
            alt=""
            style={{ objectPosition: `${c.focus}% center` }}
          />
        </picture>
      </div>
      <div
        className="hero-scrim"
        style={{
          background: `linear-gradient(90deg,rgb(0 0 0 / ${c.overlay / 100}),rgb(0 0 0 / ${c.overlay / 200}))`,
        }}
      />
    </>
  );
}
export function HomeHeadline() {
  const { state } = useDemo();
  return <h1 style={{ whiteSpace: "pre-line" }}>{state.published.headline}</h1>;
}
export function HomeDescription() {
  const { state } = useDemo();
  return <p>{state.published.description}</p>;
}
export function LoginBackground() {
  const { state } = useDemo();
  return (
    <img
      className="login-visual-image"
      src={
        validImage(state.published.loginBackground)
          ? state.published.loginBackground
          : undefined
      }
      alt=""
    />
  );
}
export function ExtraContent() {
  const { state } = useDemo();
  const media = state.gallery.filter(
    (m) => m.visible && m.url && validImage(m.url),
  );
  return (
    <>
      {state.stories
        .filter((s) => s.featured && s.status === "published")
        .slice(0, 3)
        .map((s) => (
          <section className="section cms-feature" key={s.id}>
            <small>Featured Story · {s.category}</small>
            <h2>{s.title}</h2>
            <p>{s.summary}</p>
            <Link href={"/stories/" + s.slug}>Baca Story</Link>
          </section>
        ))}
      {!!media.length && (
        <section
          className="section cms-public-gallery"
          aria-label="Galeri komunitas"
        >
          {media.map((m) => (
            <figure key={m.id}>
              <img src={m.url} alt={m.caption} />
              <figcaption>{m.caption}</figcaption>
            </figure>
          ))}
        </section>
      )}
      <p className="cms-footer-note">{state.published.footer}</p>
    </>
  );
}
export function StoryDetail({ slug }: { slug: string }) {
  const { state, ready } = useDemo();
  if (!ready) return <p role="status">Memuat Story…</p>;
  const s = state.stories.find(
    (s) => s.slug === slug && s.status === "published",
  );
  if (!s)
    return (
      <section className="section">
        <h1>Story belum tersedia</h1>
        <p>Tulisan demo hanya tersedia di browser tempat tulisan dibuat.</p>
        <Link href="/stories">Kembali ke Stories</Link>
      </section>
    );
  return (
    <article className="cms-article">
      <Link href="/stories">Semua Stories</Link>
      <small>
        {s.category} · {s.author}
      </small>
      <h1>{s.title}</h1>
      <p>{s.summary}</p>
      {s.cover && validImage(s.cover) && <img src={s.cover} alt={s.title} />}
      <div>{s.body}</div>
    </article>
  );
}
export function PublishedStories() {
  const { state } = useDemo();
  return (
    <>
      {state.stories
        .filter((s) => s.status === "published")
        .map((s) => (
          <article className="story-card" key={s.id}>
            {s.cover && validImage(s.cover) && <img src={s.cover} alt="" />}
            <span className="kicker">{s.category}</span>
            <h2>{s.title}</h2>
            <p>{s.summary}</p>
            <Link href={"/stories/" + s.slug}>Baca Story</Link>
          </article>
        ))}
    </>
  );
}
