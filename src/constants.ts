import { Symbol } from "./types"

// Native Tokens
export const BTC = new Symbol("btc", "Bitcoin", { ImageType: "relative", ImageData: "images/BTC.png" }, undefined, 8, 4, "BTC")
export const ETH = new Symbol("eth", "Ethereum", { ImageType: "relative", ImageData: "images/ETH.png" }, undefined, 18, 2, "ETH")

// ERC20 Tokens
export const STETH = new Symbol("steth", "Lido Staked Ether", { ImageType: "relative", ImageData: "images/STETH.png" }, "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84", 18, 2, "ETH")
export const USDT = new Symbol("usdt", "Tether", { ImageType: "relative", ImageData: "images/USDT.png" }, "0xdac17f958d2ee523a2206206994597c13d831ec7", 6, 2, "Stable")
export const USDC = new Symbol("usdc", "USD Coin", { ImageType: "relative", ImageData: "images/USDC.png" }, "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", 6, 2, "Stable")
export const AETHUSDT = new Symbol("aEthUSDT", "Aave Ethereum USDT", { ImageType: "relative", ImageData: "images/USDT.png" }, "0x23878914efe38d27c4d67ab83ed1b93a74d4086a", 6, 2, "Stable")

export const Erc20Tokens = [USDT, USDC, STETH, AETHUSDT]
export const AllTokens = [BTC, ETH, ...Erc20Tokens]

/**
 * Auto sync interval in seconds
 */
export const SyncIntervalSeconds = 60
