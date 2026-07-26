import { HonoRequest } from "@hono/hono";

export class Logger {

    private static includeTimestamps = true;

    static setIncludeTimestamps(enable: boolean) : void {
        Logger.includeTimestamps = enable;
    }

    private static getTimestamp() : string {
        if (!Logger.includeTimestamps)
            return "";
        return `[${new Date().toISOString()}] `;
    }

    static log(text: string) : void {
        console.log(`${Logger.getTimestamp()}I: ${text}`);
    }

    static info(text: string) : void { Logger.log(text); }

    static warn(text: string) : void {
        console.warn(`%c${Logger.getTimestamp()}W: ${text}`, "color: yellow");
    }

    static error(text: string) : void {
        console.error(`%c${Logger.getTimestamp()}E: ${text}`, "color: red");
    }

    static errorHonoContext(text: string, req: HonoRequest) {
        console.error(`%c${Logger.getTimestamp()}E(HTTP): ${text}\n${Deno.inspect(req)}\n`, "color: red");
    }
}
