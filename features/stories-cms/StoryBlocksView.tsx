import { embedTarget } from "@/lib/stories/story-blocks";
import type { PublicImage, PublicStoryBlock } from "@/lib/stories/story-types";

/**
 * One renderer for the public article and the private editor preview. Every value is rendered as a
 * React text node or attribute; raw HTML injection is never used and no third-party script loads.
 * Embeds are re-derived from the allowlist at render time, so a stored URL never becomes an iframe src.
 */
function Figure({ image, className }: { image: PublicImage; className?: string }) {
  return <figure className={className}>
    <img src={image.media.url!} alt={image.alt} width={image.media.width ?? undefined} height={image.media.height ?? undefined} loading="lazy" decoding="async" />
    {image.caption ? <figcaption>{image.caption}</figcaption> : null}
  </figure>;
}
function Embed({ url }: { url: string }) {
  const target = embedTarget(url);
  if (!target) return null;
  if (target.frameSrc) return <figure className={`uss-block-embed uss-block-embed-${target.provider}`}>
    <iframe src={target.frameSrc} title={target.title} loading="lazy" allow="encrypted-media; picture-in-picture; fullscreen" referrerPolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-presentation allow-popups" />
    <figcaption><a href={target.url} rel="noopener noreferrer nofollow" target="_blank">Open on {target.title.split(" ")[0]} ↗</a></figcaption>
  </figure>;
  return <p className="uss-block-link-card"><a href={target.url} rel="noopener noreferrer nofollow" target="_blank"><span>{target.title}</span><strong>View on {target.title.split(" ")[0]} ↗</strong></a></p>;
}
export function StoryBlocksView({ blocks, empty = null }: { blocks: readonly PublicStoryBlock[]; empty?: React.ReactNode }) {
  if (!blocks.length) return <>{empty}</>;
  return <>{blocks.map((block, index) => {
    switch (block.type) {
      case "paragraph": return <p key={index}>{block.text}</p>;
      case "heading": return block.level === 2 ? <h2 key={index} className="uss-block-heading">{block.text}</h2> : <h3 key={index} className="uss-block-heading">{block.text}</h3>;
      case "image": return <Figure key={index} image={block} className="uss-block-image" />;
      case "gallery": return <div key={index} className="uss-block-gallery" role="group" aria-label={`Gallery of ${block.items.length} images`}>{block.items.map((item, i) => <Figure key={i} image={item} />)}</div>;
      case "quote": return <blockquote key={index} className="uss-block-quote"><p>{block.text}</p>{block.attribution ? <cite>— {block.attribution}</cite> : null}</blockquote>;
      case "embed": return <Embed key={index} url={block.url} />;
      case "cta": {
        const external = /^https:/i.test(block.url);
        return <p key={index} className="uss-block-cta"><a className="uss-button uss-button-primary" href={block.url} {...(external ? { rel: "noopener noreferrer", target: "_blank" } : {})}>{block.label}{external ? " ↗" : ""}</a></p>;
      }
      case "divider": return <hr key={index} className="uss-block-divider" />;
      default: return null;
    }
  })}</>;
}
/** First paragraph text, for meta descriptions. */
export function firstParagraph(blocks: readonly PublicStoryBlock[]) {
  return blocks.find((b): b is Extract<PublicStoryBlock, { type: "paragraph" }> => b.type === "paragraph")?.text;
}
