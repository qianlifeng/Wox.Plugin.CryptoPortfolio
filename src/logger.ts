import { Context, PublicAPI } from "@wox-launcher/wox-plugin"

let api: PublicAPI | null = null

export function initLogger(publicApi: PublicAPI) {
  api = publicApi
}

export function log(ctx: Context, level: "Info" | "Warning" | "Error", message: string) {
  if (api) {
    api.Log(ctx, level, message)
  }
}
