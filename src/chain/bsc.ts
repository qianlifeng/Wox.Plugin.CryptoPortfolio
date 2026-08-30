import { Context } from "@wox-launcher/wox-plugin"
import { fetchBnbBalances } from "../api/bsc"
import { BNB } from "../constants"
import { log } from "../logger"
import { AssetInfo } from "../types"
import { IChain } from "./chain"

export class BscChain implements IChain {
  token = BNB

  async getBalances(ctx: Context, addresses: string[]): Promise<AssetInfo[]> {
    if (addresses.length === 0) return []

    try {
      log(ctx, "Info", `Fetching ${addresses.length} BNB Smart Chain addresses`)
      const balanceMap = await fetchBnbBalances(addresses)

      return addresses.map(address => {
        const balance = balanceMap.get(address) || 0
        return {
          address,
          balance,
          balanceFormatted: balance / 1e18,
          value: 0
        }
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      log(ctx, "Error", `Failed to fetch BNB balances: ${message}`)
      return addresses.map(address => ({ address, balance: 0, balanceFormatted: 0, value: 0 }))
    }
  }
}
