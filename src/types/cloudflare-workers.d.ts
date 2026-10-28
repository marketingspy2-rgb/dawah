// Minimal typing for the Workers runtime module, used only by the Cloudflare build.
declare module "cloudflare:workers" {
  export const env: Record<string, unknown>;
}
