import { Logger } from "./Logger.ts";

import { Hono } from "@hono/hono";
import { getConnInfo } from "@hono/hono/deno";

export class HonoWrapper {
	private app: Hono;

	constructor() {
		this.app = new Hono();
	}

	getApp(): Hono {
		return this.app;
	}

	// deno-lint-ignore no-explicit-any
	get(path: string, handler: (c: any) => any): void {
		this.app.get(path, (ctx) => {
			const ua = ctx.req.header('User-Agent') || "Unknown User Agent";
			Logger.log(`GET '${ctx.req.path}' from '${ua}'`);
			try {
				return handler(ctx);
			} catch (e) {
				return this._handleHonoError(ctx, e);
			}
		});
	}

	// deno-lint-ignore no-explicit-any
	post(path: string, handler: (c: any) => any): void {
		this.app.post(path, (ctx) => {
			const ua = ctx.req.header('User-Agent') || "Unknown User Agent";
			Logger.log(`POST '${ctx.req.path}' from '${ua}'`);
			try {
				return handler(ctx);
			} catch (e) {
				return this._handleHonoError(ctx, e);
			}
		});
	}

	// deno-lint-ignore no-explicit-any
	put(path: string, handler: (c: any) => any): void {
		this.app.put(path, (ctx) => {
			const ua = ctx.req.header('User-Agent') || "Unknown User Agent";
			Logger.log(`PUT '${ctx.req.path}' from '${ua}'`);
			try {
				return handler(ctx);
			} catch (e) {
				return this._handleHonoError(ctx, e);
			}
		});
	}

	// deno-lint-ignore no-explicit-any
	delete(path: string, handler: (c: any) => any): void {
		this.app.delete(path, (ctx) => {
			const ua = ctx.req.header('User-Agent') || "Unknown User Agent";
			Logger.log(`DELETE '${ctx.req.path}' from '${ua}'`);
			try {
				return handler(ctx);
			} catch (e) {
				return this._handleHonoError(ctx, e);
			}
		});
	}

	// deno-lint-ignore no-explicit-any
	_handleHonoError(ctx: any, e: any): void {
		Logger.errorHonoContext(Deno.inspect(e), ctx.req);
		if (e instanceof Deno.errors.NotFound) {
			return ctx.text("404 Not Found", 404);
		} else {
			return ctx.text("500 Internal Server Error", 500);
		}
	}

}
