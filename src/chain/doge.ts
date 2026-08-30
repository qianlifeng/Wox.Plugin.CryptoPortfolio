import { Context } from "@wox-launcher/wox-plugin"
import { fetchDogeBalances } from "../api/blockchain"
import { DOGE } from "../constants"
import { log } from "../logger"
import { AssetInfo } from "../types"
import { IChain } from "./chain"

export class DogeChain implements IChain {
  token = DOGE

  async getBalances(ctx: Context, addresses: string[]): Promise<AssetInfo[]> {
    if (addresses.length === 0) return []

    try {
      log(ctx, "Info", `Fetching ${addresses.length} DOGE addresses`)
      const balanceMap = await fetchDogeBalances(addresses)

      return addresses.map(address => {
        const balance = balanceMap.get(address) || 0
        return {
          address,
          balance,
          balanceFormatted: balance / 1e8,
          value: 0
        }
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      log(ctx, "Error", `Failed to fetch DOGE balances: ${message}`)
      return addresses.map(address => ({ address, balance: 0, balanceFormatted: 0, value: 0 }))
    }
  }
}
