import PostEditor from "@/components/admin/PostEditor";
import { listAdminTags, listTakenSlugs } from "@/lib/blog-admin";

/** Create a post. The editor is shared with the edit route; `post={null}` is what puts
 *  it in create mode. */
export const dynamic = "force-dynamic";

export default async function NewPostPage() {
  // Fetched in parallel: neither depends on the other, and the editor needs both before
  // it can render (the tag chips and the slug-collision suggestion).
  const [tags, takenSlugs] = await Promise.all([listAdminTags(), listTakenSlugs()]);

  return <PostEditor post={null} tags={tags} takenSlugs={takenSlugs} />;
}
