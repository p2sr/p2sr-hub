import { contentType } from "@std/media-types";
import { HonoWrapper } from "./HonoWrapper.ts";
import { Logger } from "./Logger.ts";
import { isDevMode } from "./Utils/Meta.ts";
import { walk } from "./Utils/Walk.ts";

const PORT = isDevMode() ? 8080 : 80;
const STATIC_CACHE_SEC = isDevMode() ? 0 : 86400; // 1 day

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
        "Cache-Control": `max-age=${STATIC_CACHE_SEC}`,
        "Access-Control-Allow-Origin": "*"
    });
});

{
    walk("./static", (filePath, isDir) => {
        let path = filePath;
        if (isDir) {
            path += "/index.html";
            try {
                Deno.lstatSync(filePath + "/index.html");
            } catch (e) {
                if (e instanceof Deno.errors.NotFound)
                    return;
                throw e;
            }
        }
        const mime = contentType(path.slice(path.lastIndexOf('.') + 1)) || "application/octet-stream";
        const data = Deno.readFileSync(path);
        const textInitial = new TextDecoder().decode(data);
        let text = textInitial;
        if (mime.startsWith('application/json')) {
            // json minify
            text = JSON.stringify(JSON.parse(text), null, 0);
        }
        if (mime.startsWith('text/html')) {
            for (let i = text.indexOf("{{TEMPLATE "); i !== -1; i = text.indexOf("{{TEMPLATE ", i + 1)) {
                const end = text.indexOf("}}", i);
                if (end === -1) break;
                const templatePath = text.slice(i + 11, end).trim();
                let templateContent = 'Unknown template';
                try {
                    templateContent = Deno.readTextFileSync(`./templates/${templatePath}`);
                } catch (e) {
                    if (e instanceof Deno.errors.NotFound) {
                        console.error(`Template not found: ${templatePath}`);
                    } else {
                        throw e;
                    }
                }
                const indent = text.slice(0, i).split("\n").pop()?.match(/^\s*/)?.[0] || "";
                const indentedTemplateContent = templateContent.split("\n").map((line) => indent + line).join("\n");
                const nextLineIndex = text.indexOf("\n", end + 2);
                if (nextLineIndex !== -1) {
                    text = text.slice(0, nextLineIndex) + "\n" + indentedTemplateContent + text.slice(nextLineIndex);
                } else {
                    text += "\n" + indentedTemplateContent;
                }
            }
        }

        const requestPath = filePath.slice("./static".length) + (isDir ? "/" : "");
        if (text != textInitial) {
            app.get(requestPath, (c) => {
                return c.body(text, 200, {
                    "Content-Type": mime,
                    "Cache-Control": `max-age=${STATIC_CACHE_SEC}`,
                    "Access-Control-Allow-Origin": "*"
                });
            });
        } else {
            app.get(requestPath, (c) => {
                return c.body(data, 200, {
                    "Content-Type": mime,
                    "Cache-Control": `max-age=${STATIC_CACHE_SEC}`,
                    "Access-Control-Allow-Origin": "*"
                });
            });
        }
        if (isDir) {
            app.get(requestPath.slice(0, -1), (c) => {
                return c.redirect(requestPath, 301);
            });
        }

        return;
    });
}


try {
    const html = Deno.readTextFileSync("./static/404.html");
    app.get("*", (c) => {
        return c.body(html, 404, {
            "Content-Type": "text/html",
            "Cache-Control": `max-age=${STATIC_CACHE_SEC}`,
            "Access-Control-Allow-Origin": "*"
        });
    });
} catch (e) {
    if (e instanceof Deno.errors.NotFound) {
        app.get("*", (c) => {
            return c.text("404 Not Found", 404, {
                "Cache-Control": `max-age=${STATIC_CACHE_SEC}`,
                "Access-Control-Allow-Origin": "*"
            });
        });
    } else {
        throw e;
    }
}

Deno.serve({ port: PORT }, app.getApp().fetch);
