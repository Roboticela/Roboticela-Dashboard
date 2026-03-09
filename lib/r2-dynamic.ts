import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

export type R2Config = {
  r2AccountId: string | null;
  r2AccessKeyId: string | null;
  r2SecretAccessKey: string | null;
  r2Bucket: string | null;
  r2PublicUrl: string | null;
};

export function isR2Configured(config: R2Config): boolean {
  return !!(
    config.r2AccountId &&
    config.r2AccessKeyId &&
    config.r2SecretAccessKey &&
    config.r2Bucket &&
    config.r2PublicUrl
  );
}

function getR2Client(config: R2Config): S3Client {
  if (!config.r2AccountId || !config.r2AccessKeyId || !config.r2SecretAccessKey) {
    throw new Error("R2 credentials not configured");
  }
  return new S3Client({
    region: "auto",
    endpoint: `https://${config.r2AccountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.r2AccessKeyId,
      secretAccessKey: config.r2SecretAccessKey,
    },
  });
}

/**
 * Derive R2 object key from file URL using the bucket's public URL as base.
 * - Uses pathname only (query/hash ignored).
 * - If public URL has a path (e.g. https://domain.com/bucket), that path is stripped from the file URL
 *   so the key matches what's actually in the bucket.
 * e.g. publicUrl=https://res.example.com, fileUrl=https://res.example.com/foo/bar.png -> key "foo/bar.png"
 * e.g. publicUrl=https://res.example.com/bucket, fileUrl=https://res.example.com/bucket/foo/bar.png -> key "foo/bar.png"
 */
function urlToKey(fileUrl: string, publicUrl: string): string {
  const raw = fileUrl.trim();
  if (!raw.startsWith("http")) return "";
  try {
    const u = new URL(raw);
    let filePath = u.pathname.replace(/^\//, "").replace(/\/$/, "");
    const baseUrl = publicUrl.trim().replace(/\/$/, "");
    if (baseUrl.startsWith("http")) {
      const base = new URL(baseUrl);
      const basePath = base.pathname.replace(/^\//, "").replace(/\/$/, "");
      if (basePath && (filePath === basePath || filePath.startsWith(basePath + "/"))) {
        filePath = filePath.slice(basePath.length).replace(/^\//, "");
      }
    }
    return filePath || "";
  } catch {
    return "";
  }
}

/**
 * Delete one or more objects from R2 by their public URLs.
 * Uses the database's R2 config. Key is derived by stripping the public URL base from each file URL.
 */
export async function deleteFromR2ByUrls(
  config: R2Config,
  urls: string[]
): Promise<{ deleted: string[]; errors: { url: string; error: string }[] }> {
  if (!isR2Configured(config) || !config.r2Bucket || !config.r2PublicUrl) {
    return { deleted: [], errors: urls.map((url) => ({ url, error: "R2 not configured" })) };
  }
  const client = getR2Client(config);
  const deleted: string[] = [];
  const errors: { url: string; error: string }[] = [];
  for (const url of urls) {
    if (!url || !url.startsWith("http")) {
      errors.push({ url, error: "Invalid URL" });
      continue;
    }
    const key = urlToKey(url, config.r2PublicUrl!);
    if (!key) {
      errors.push({
        url,
        error: `Could not derive object key from URL (pathname is empty or invalid). Public URL base: ${config.r2PublicUrl}`,
      });
      continue;
    }
    try {
      // Verify object exists before delete; R2/S3 DeleteObject returns success even when key doesn't exist
      await client.send(
        new HeadObjectCommand({
          Bucket: config.r2Bucket!,
          Key: key,
        })
      );
    } catch (headErr: unknown) {
      const err = headErr as { name?: string; message?: string; $metadata?: { httpStatusCode?: number } };
      const status = err?.$metadata?.httpStatusCode;
      const code = typeof err?.name === "string" ? err.name : "";
      const isNotFound =
        status === 404 ||
        code === "NotFound" ||
        code === "NoSuchKey" ||
        (err?.message?.includes("Not Found") ?? false) ||
        (err?.message?.includes("NoSuchKey") ?? false);
      if (isNotFound) {
        errors.push({
          url,
          error: `Object not found in R2 (key: ${key}). Check that the file URL matches this bucket's public URL (${config.r2PublicUrl}) and path.`,
        });
      } else {
        errors.push({ url, error: err?.message ?? "Could not check object in R2" });
      }
      continue;
    }
    try {
      await client.send(
        new DeleteObjectCommand({
          Bucket: config.r2Bucket!,
          Key: key,
        })
      );
      deleted.push(url);
    } catch (e) {
      errors.push({ url, error: e instanceof Error ? e.message : "Delete failed" });
    }
  }
  return { deleted, errors };
}

export type R2ObjectInfo = { key: string; size: number; lastModified: string; url: string };

/**
 * List objects in the R2 bucket, optionally under a prefix. Returns key, size, lastModified, and public URL.
 */
export async function listR2Objects(
  config: R2Config,
  prefix = ""
): Promise<R2ObjectInfo[]> {
  if (!isR2Configured(config) || !config.r2Bucket || !config.r2PublicUrl) {
    return [];
  }
  const client = getR2Client(config);
  const base = config.r2PublicUrl.replace(/\/$/, "");
  const out: R2ObjectInfo[] = [];
  let continuationToken: string | undefined;
  do {
    const result = await client.send(
      new ListObjectsV2Command({
        Bucket: config.r2Bucket,
        Prefix: prefix || undefined,
        MaxKeys: 1000,
        ContinuationToken: continuationToken,
      })
    );
    const contents = result.Contents ?? [];
    for (const obj of contents) {
      if (!obj.Key) continue;
      out.push({
        key: obj.Key,
        size: obj.Size ?? 0,
        lastModified: obj.LastModified?.toISOString() ?? "",
        url: `${base}/${obj.Key}`,
      });
    }
    continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
  } while (continuationToken);
  return out;
}

/**
 * Delete one or more objects from R2 by their keys (not URLs).
 */
export async function deleteFromR2ByKeys(
  config: R2Config,
  keys: string[]
): Promise<{ deleted: string[]; errors: { key: string; error: string }[] }> {
  if (!isR2Configured(config) || !config.r2Bucket) {
    return { deleted: [], errors: keys.map((k) => ({ key: k, error: "R2 not configured" })) };
  }
  const client = getR2Client(config);
  const deleted: string[] = [];
  const errors: { key: string; error: string }[] = [];
  const BATCH = 1000;
  for (let i = 0; i < keys.length; i += BATCH) {
    const chunk = keys.slice(i, i + BATCH).filter(Boolean);
    if (chunk.length === 0) continue;
    try {
      await client.send(
        new DeleteObjectsCommand({
          Bucket: config.r2Bucket,
          Delete: { Objects: chunk.map((Key) => ({ Key })), Quiet: true },
        })
      );
      deleted.push(...chunk);
    } catch (e) {
      for (const k of chunk) {
        errors.push({ key: k, error: e instanceof Error ? e.message : "Delete failed" });
      }
    }
  }
  return { deleted, errors };
}

/**
 * Upload a file to R2 using the database's R2 config. Returns the public URL.
 */
export async function uploadToR2WithConfig(
  config: R2Config,
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<{ url: string; key: string }> {
  if (!isR2Configured(config) || !config.r2Bucket || !config.r2PublicUrl) {
    throw new Error("R2 not configured");
  }
  const client = getR2Client(config);
  await client.send(
    new PutObjectCommand({
      Bucket: config.r2Bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  const base = config.r2PublicUrl.replace(/\/$/, "");
  const url = `${base}/${key}`;
  return { url, key };
}
