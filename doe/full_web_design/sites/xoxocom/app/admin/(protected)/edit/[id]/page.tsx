import { notFound } from "next/navigation";

import PostEditor from "@/components/admin/PostEditor";
import { getAdminPost, listAdminTags, listTakenSlugs } from "@/lib/blog-admin";

/**
 * Edit a post.
 *
 * The route is /admin/edit/[id], not /admin/[id], so a dynamic segment can never shadow
 * a static admin route (/admin/new, /admin/topics, /admin/login). Cheap insurance
 * against a future page name colliding with a uuid-shaped path.
 */
export const dynamic = "force-dynamic";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Postgres rejects a malformed uuid with a 22P02 error rather than an empty result, so
  // check the shape before querying and turn a bad URL into a 404 instead of a 500.
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const [post, tags, takenSlugs] = await Promise.all([
    getAdminPost(id),
    listAdminTags(),
    // Excludes this post, so its own slug is not treated as taken by the suggester.
    listTakenSlugs(id),
  ]);

  if (!post) notFound();

  return <PostEditor post={post} tags={tags} takenSlugs={takenSlugs} />;
}
