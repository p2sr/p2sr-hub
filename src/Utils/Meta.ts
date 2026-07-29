
export function isDevMode(): boolean {
    return Deno.args.includes("--dev");
}
