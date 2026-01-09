import axios from "axios"
import { CryptoPrices } from "../types"
import { Context, PublicAPI } from "@wox-launcher/wox-plugin"

export class PriceService {
  private static readonly API_URL = "https://api.coingecko.com/api/v3/simple/price"
  private apiKey?: string
  private api: PublicAPI

  constructor(api: PublicAPI, apiKey?: string) {
    this.apiKey = apiKey
    this.api = api
  }

  async fetchPrices(ctx: Context, currency: string): Promise<CryptoPrices> {
    const currencyLower = currency.toLowerCase()
    const url = `${PriceService.API_URL}?ids=bitcoin,ethereum,tether,usd-coin&vs_currencies=${currencyLower}`

    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      Accept: "application/json"
    }

    if (this.apiKey) {
      // CoinGecko Demo API Key header
      headers["x-cg-demo-api-key"] = this.apiKey
    }

    // Create an instance to ensure headers are applied
    const client = axios.create({ headers })

    try {
      const response = await client.get<CryptoPrices>(url)
      this.api.Log(ctx, "Info", `[PriceService] Response: ${JSON.stringify(response.data)}`)
      return response.data
    } catch (error: any) {
      this.api.Log(ctx, "Error", `[PriceService] Failed to fetch prices: ${error.message}`)
      if (error.response) {
        this.api.Log(ctx, "Error", `[PriceService] Status: ${error.response.status}`)
      }
      // Return empty or throw, Manager handles partial failures
      return { bitcoin: {}, ethereum: {} }
    }
  }
}
