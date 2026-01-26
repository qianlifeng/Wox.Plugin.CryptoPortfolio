import { Symbol } from "./types"

export const BTC = new Symbol("btc", "Bitcoin", { ImageType: "relative", ImageData: "images/BTC.png" })
export const ETH = new Symbol("eth", "Ethereum", { ImageType: "relative", ImageData: "images/ETH.png" })
export const USDT = new Symbol("usdt", "Tether", { ImageType: "relative", ImageData: "images/USDT.png" })
export const USDC = new Symbol("usdc", "USD Coin", { ImageType: "relative", ImageData: "images/USDC.png" })
export const STETH = new Symbol("steth", "Lido Staked Ether", { ImageType: "relative", ImageData: "images/STETH.png" })

/**
 * Auto sync interval in seconds
 */
export const SyncIntervalSeconds = 60
