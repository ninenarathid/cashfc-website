import { notFound } from "next/navigation";
import { GUIDES, guideBySlug } from "@/lib/guides";
import GuideScreen from "@/components/guides/GuideScreen";

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const g = guideBySlug(slug);
  return { title: g ? `${g.short ?? g.name} — Cafe And SHabu` : "Guide" };
}

export default async function Page(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const guide = guideBySlug(slug);
  if (!guide) notFound();
  return <GuideScreen guide={guide} />;
}
