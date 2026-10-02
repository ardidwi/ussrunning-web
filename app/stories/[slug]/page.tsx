import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { StoryDetail } from "@/components/cms/PublicContent";
export default async function StoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <main className="page-black">
      <SiteHeader />
      <StoryDetail slug={slug} />
      <SiteFooter />
    </main>
  );
}
