import { contentType } from "@std/media-types";
import { HonoWrapper } from "./HonoWrapper.ts";
import { isDevMode } from "./Meta.ts";
import { Logger } from "./Logger.ts";

const PORT = 8080;

const app = new HonoWrapper();

const redirects = JSON.parse(Deno.readTextFileSync("./static/redirects.json"));
for (const redirect of redirects) {
    for (const path of redirect.path) {
        app.get(`/${path}`, (c) => {
            Logger.log(`Redirecting to: ${redirect.dest} with status: ${redirect.type}`);
            return c.redirect(redirect.dest, redirect.type);
        });
    }
}

app.get("redirects", (c) => {
    let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Redirects</title></head><body><h1>Redirects</h1><ul>`;
    for (const redirect of redirects) {
        html += `<li><a href="${redirect.dest}">`;
        for (const path of redirect.path) {
            html += `<span style="padding-right: 0.5em;">${path}</span>`;
        }
        html += `</a></li>`;
    }
    html += `<hr><li><a href="redirects.json">redirects.json</a></li>`;
    html += `<li><a href="redirects">this page</a></li>`;
    html += `</ul></body></html>`;
    return c.html(html, 200, {
        "Cache-Control": `max-age=${isDevMode() ? 0 : staticCacheTimeSeconds}`,
        "Access-Control-Allow-Origin": "*"
    });
});

const staticCacheTimeSeconds = isDevMode() ? 0 : 86400; // 1 day
app.get("*", (c) => {
    let path = `./static${c.req.path}`;
    let status = 200;
    try {
        if (Deno.lstatSync(path).isDirectory) {
            path += "/index.html";
            Deno.lstatSync(path);
        }
    } catch (e) {
        if (e instanceof Deno.errors.NotFound) {
            path = "./static/404.html";
            try {
                Deno.lstatSync(path);
            } catch (e) {
                if (e instanceof Deno.errors.NotFound) {
                    return c.text("404 Not Found", 404);
                } else throw e;
            }
            status = 404;
        } else throw e;
    }

    const mime = contentType(path.slice(path.lastIndexOf('.') + 1)) || "application/octet-stream";
    let body = Deno.readFileSync(path);
    if (mime.startsWith('application/json')) {
        const text = JSON.stringify(JSON.parse(Deno.readTextFileSync(path)), null, 0);
        body = new TextEncoder().encode(text);
    }
    return c.body(body, status, {
        "Content-Type": mime,
        "Cache-Control": `max-age=${staticCacheTimeSeconds}`,
        "Access-Control-Allow-Origin": "*"
    });
});

Deno.serve({ port: PORT }, app.getApp().fetch);
