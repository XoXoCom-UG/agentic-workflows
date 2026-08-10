import type { Metadata } from "next";
import { notFound } from "next/navigation";

import BlogPostContent from "@/components/content/BlogPostContent";
import { getPostBySlug } from "@/lib/blog";
import { ALTERNATE_OG_LOCALE, DEFAULT_OG_LOCALE, buildMetadata } from "@/lib/seo";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  // A missing slug still renders (as the 404 body), so give it metadata that keeps
  // it out of the index rather than letting it inherit the layout's defaults.
  if (!post) {
    return {
      title: "Not found",
      robots: { index: false, follow: false },
    };
  }

  const de = post.lang === "de";
  return buildMetadata({
    title: post.seoTitle ?? post.title,
    description: post.seoDescription ?? post.excerpt,
    path: `/blog/${post.slug}`,
    // The post's own language leads; the other is advertised as the alternate,
    // mirroring how the German-only legal pages flip the pair.
    locale: de ? ALTERNATE_OG_LOCALE : DEFAULT_OG_LOCALE,
    alternateLocale: de ? DEFAULT_OG_LOCALE : ALTERNATE_OG_LOCALE,
    type: "article",
    article: {
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt ?? undefined,
      authors: post.authorName ? [post.authorName] : undefined,
      tags: post.tags,
    },
    // Falls back to the site-wide OG image when the post has no cover.
    image: post.coverUrl ?? undefined,
  });
}

export default async function BlogPostPage({ params }: { params: Params }) {
  const { slug } = await params;

  // The 404 decision lives here, in the route segment, NOT inside BlogPostContent.
  // If the page returns first and a nested async component calls notFound() later,
  // the response shell has already streamed and Next answers 200 with not-found
  // markup — a soft 404, which search engines treat as a thin page and keep
  // crawling. Awaiting here means the status is decided before anything is sent.
  // getPostBySlug is cached, so this shares one query with generateMetadata.
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  return <BlogPostContent post={post} />;
}
