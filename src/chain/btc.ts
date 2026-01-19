import { Context } from "@wox-launcher/wox-plugin"
import { BTC } from "../constants"
import { AssetInfo } from "../types"
import { IChain } from "./chain"
import { fetchBtcBalances } from "../api/blockchain"
import { log } from "../logger"

export class BtcChain implements IChain {
  token = BTC

  async getBalances(ctx: Context, addresses: string[]): Promise<AssetInfo[]> {
    if (addresses.length === 0) return []

    log(ctx, "Info", `Fetching ${addresses.length} BTC addresses`)
    try {
      const balanceMap = await fetchBtcBalances(addresses)

      return addresses.map(addr => {
        const balance = balanceMap.get(addr) || 0
        return {
          address: addr,
          balance: balance,
          balanceFormatted: balance / 100000000, // Satoshi to BTC
          value: 0
        }
      })
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      log(ctx, "Error", `Failed to fetch BTC balances: ${msg}`)
      return addresses.map(addr => ({
        address: addr,
        balance: 0,
        balanceFormatted: 0,
        value: 0
      }))
    }
  }
}
