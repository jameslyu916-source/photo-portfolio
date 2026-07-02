import type { Plugin, ViteDevServer } from "vite";
import fs from "node:fs";
import path from "node:path";
import { createToken, verifyToken, getPassword, parseCookies } from "../admin/api/auth";
import { listPhotos, getPhoto, createPhoto, updatePhoto, deletePhoto } from "../admin/api/photos";
import { handleUpload, serveThumbnail } from "../admin/api/upload";

const ADMIN_DIR = path.resolve("src/admin");

function setCookie(res: any, name: string, value: string, maxAge: number) {
  res.setHeader(
    "Set-Cookie",
    `${name}=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}`,
  );
}

function json(res: any, data: unknown, status = 200) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

function readBody(req: any): Promise<string> {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk: Buffer) => (body += chunk.toString()));
    req.on("end", () => resolve(body));
  });
}

function requireAuth(req: any, res: any): boolean {
  const pw = getPassword();
  if (!pw) {
    json(res, { error: "ADMIN_PASSWORD not set. Create a .env file with ADMIN_PASSWORD=your_password." }, 500);
    return false;
  }
  const cookieHeader = req.headers.cookie ?? "";
  const cookies = parseCookies(cookieHeader);
  const token = cookies.admin_token;
  if (!token || !verifyToken(token, pw)) {
    json(res, { error: "Unauthorized" }, 401);
    return false;
  }
  return true;
}

function serveStatic(res: any, filePath: string, contentType: string) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.statusCode = 404;
    res.end("Not found");
    return;
  }
  res.statusCode = 200;
  res.setHeader("Content-Type", contentType);
  res.end(fs.readFileSync(filePath, "utf-8"));
}

export default function adminPlugin(): Plugin {
  return {
    name: "vite-admin-plugin",
    configureServer(server: ViteDevServer) {
      const handler = async (req: any, res: any, next: any) => {
        const url = new URL(req.url ?? "/", "http://localhost");

        // --- Admin static files ---
        if (url.pathname === "/admin" || url.pathname === "/admin/") {
          serveStatic(res, path.join(ADMIN_DIR, "index.html"), "text/html");
          return;
        }
        if (url.pathname === "/admin/admin.css") {
          serveStatic(res, path.join(ADMIN_DIR, "admin.css"), "text/css");
          return;
        }
        if (url.pathname === "/admin/admin.js") {
          serveStatic(res, path.join(ADMIN_DIR, "admin.js"), "application/javascript");
          return;
        }

        // --- API routes ---
        if (!url.pathname.startsWith("/api/admin/")) {
          next();
          return;
        }

        const apiPath = url.pathname.replace("/api/admin", "") || "/";

        try {
          if (apiPath === "/login" && req.method === "POST") {
            const pw = getPassword();
            if (!pw) { json(res, { error: "ADMIN_PASSWORD not configured" }, 500); return; }
            const body = JSON.parse(await readBody(req));
            if (body.password !== pw) { json(res, { error: "Invalid password" }, 401); return; }
            setCookie(res, "admin_token", createToken(pw), 24 * 60 * 60);
            json(res, { ok: true });
            return;
          }

          if (apiPath === "/logout" && req.method === "POST") {
            setCookie(res, "admin_token", "", 0);
            json(res, { ok: true });
            return;
          }

          if (!requireAuth(req, res)) return;

          if (apiPath === "/photos" && req.method === "GET") {
            json(res, await listPhotos());
            return;
          }

          const photoMatch = apiPath.match(/^\/photos\/([^/]+)$/);
          if (photoMatch) {
            const slug = photoMatch[1];
            if (req.method === "GET") {
              const photo = await getPhoto(slug);
              if (!photo) { json(res, { error: "Photo not found" }, 404); return; }
              json(res, photo);
              return;
            }
            if (req.method === "PUT") {
              await updatePhoto(slug, JSON.parse(await readBody(req)));
              json(res, { ok: true });
              return;
            }
            if (req.method === "DELETE") {
              await deletePhoto(slug);
              json(res, { ok: true });
              return;
            }
          }

          if (apiPath === "/photos" && req.method === "POST") {
            const result = await handleUpload(req);
            await createPhoto(result.slug, result.imageFilename, {
              titleEn: result.fields.titleEn ?? "",
              titleZh: result.fields.titleZh ?? "",
              descriptionEn: result.fields.descriptionEn,
              descriptionZh: result.fields.descriptionZh,
              camera: result.fields.camera,
              lens: result.fields.lens,
              settings: result.fields.settings,
              location: result.fields.location,
              series: (result.fields.series ?? "").toLowerCase().replace(/\s+/g, "-"),
              featured: result.fields.featured === "true",
              date: result.fields.date,
              order: parseInt(result.fields.order ?? "0"),
              instagramUrl: result.fields.instagramUrl,
              threadsUrl: result.fields.threadsUrl,
              xiaohongshuUrl: result.fields.xiaohongshuUrl,
            });
            json(res, { slug: result.slug, imageFilename: result.imageFilename }, 201);
            return;
          }

          const thumbMatch = apiPath.match(/^\/thumbnail\/([^/]+)$/);
          if (thumbMatch && req.method === "GET") {
            await serveThumbnail(thumbMatch[1], res);
            return;
          }

          json(res, { error: "Not found" }, 404);
        } catch (err: any) {
          console.error("[admin] Error:", err);
          json(res, { error: err.message ?? "Internal server error" }, 500);
        }
      };

      // Insert at the front of the connect middleware stack.
      // This must run before Astro's routing middleware which would
      // return 404 for paths it doesn't recognize (like /admin).
      server.middlewares.stack.unshift({ route: "", handle: handler });

      // Log stack order for debugging
      const names = server.middlewares.stack.map((m: any) => {
        if (m.handle === handler) return "admin";
        if (m.handle.name) return m.handle.name;
        return "anon";
      });
      console.log("[admin] Middleware order:", names.join(" → "));
    },
  };
}
