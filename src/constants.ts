import { WoxImage } from "@wox-launcher/wox-plugin"

export class Symbol {
  constructor(
    public symbol: string,
    public name: string,
    public logo: WoxImage
  ) {}
}

export const BTC = new Symbol("btc", "Bitcoin", { ImageType: "relative", ImageData: "images/BTC.png" })
export const ETH = new Symbol("eth", "Ethereum", { ImageType: "relative", ImageData: "images/ETH.png" })
export const USDT = new Symbol("usdt", "Tether", { ImageType: "relative", ImageData: "images/USDT.png" })
export const USDC = new Symbol("usdc", "USD Coin", { ImageType: "relative", ImageData: "images/USDC.png" })
