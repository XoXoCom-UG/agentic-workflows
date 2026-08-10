import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { getSupabase } from "@/lib/supabase";
import { getCurrentAuthor } from "@/lib/supabase-auth";

/**
 * Image upload for the editor: multipart in, a public URL out.
 *
 * A Route Handler rather than a Server Action, and this is the one genuine exception in
 * the admin. Server Actions handle the CRUD because they can call revalidateTag; this
 * endpoint handles a raw file body and is called with fetch() from the editor, which is
 * exactly the shape a Route Handler is for.
 *
 * It is also the one admin path that uses the SERVICE client. The `blog-media` bucket
 * grants anon read but no anon write, so the session client cannot upload — and that is
 * the right split: writes are mediated by this endpoint, which validates first, rather
 * than by a browser-held key. Authorisation is checked here, before the service key is
 * ever touched.
 */

const BUCKET = "blog-media";
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * SVG is deliberately absent. An .svg is an XML document that can carry <script>, and
 * served from our own origin it would be stored XSS with the same reach as an injected
 * tag. There is no safe way to accept one here without a separate sanitising pass.
 */
const ALLOWED: Record<string, { ext: string; sniff: (b: Uint8Array) => boolean }> = {
  "image/png": {
    ext: "png",
    sniff: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  },
  "image/jpeg": {
    ext: "jpg",
    sniff: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  "image/webp": {
    ext: "webp",
    sniff: (b) => ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WEBP",
  },
  "image/avif": {
    ext: "avif",
    // ftyp box at offset 4, brand at 8. Covers avif and the avis sequence brand.
    sniff: (b) => ascii(b, 4, 8) === "ftyp" && ascii(b, 8, 12).startsWith("avi"),
  },
};

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.slice(start, end));
}

function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  // Not requireAuthor(): a throw here would surface as an opaque 500. The editor needs a
  // status code it can report.
  const author = await getCurrentAuthor();
  if (!author) return fail(401, "Not signed in as an author.");

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail(400, "Expected a multipart form body.");
  }

  const file = form.get("file");
  if (!(file instanceof File)) return fail(400, "No file was attached.");
  if (file.size === 0) return fail(400, "That file is empty.");
  if (file.size > MAX_BYTES) {
    return fail(413, `That file is ${(file.size / 1_048_576).toFixed(1)} MB. The limit is 5 MB.`);
  }

  const declared = ALLOWED[file.type];
  if (!declared) {
    return fail(415, `${file.type || "That file type"} is not accepted. Use PNG, JPEG, WebP or AVIF.`);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  // The browser's Content-Type comes from the file extension and is trivially forged, so
  // the declared type only selects which signature to expect — the bytes decide. This is
  // what stops a renamed .html or .svg being served from our own origin.
  if (bytes.length < 12 || !declared.sniff(bytes)) {
    return fail(415, `That file does not look like a valid ${declared.ext.toUpperCase()} image.`);
  }

  // The original filename is discarded rather than sanitised. It is attacker-controlled
  // and only ever a source of path-traversal and collision bugs; nothing downstream needs
  // it, because alt text carries the meaning. Random names also mean a draft's cover is
  // not guessable from a public bucket before the post goes live.
  const now = new Date();
  const path = `posts/${now.getUTCFullYear()}/${randomUUID()}.${declared.ext}`;

  const { error } = await getSupabase()
    .storage.from(BUCKET)
    .upload(path, bytes, { contentType: file.type, cacheControl: "31536000", upsert: false });

  if (error) {
    console.error("[admin] upload failed", error);
    return fail(502, "Storage rejected the upload. Check that the blog-media bucket exists.");
  }

  const { data } = getSupabase().storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
