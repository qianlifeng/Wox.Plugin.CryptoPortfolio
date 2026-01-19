import { Context } from "@wox-launcher/wox-plugin"
import { AssetInfo, Symbol } from "../types"
import { IChain } from "./chain"
import { fetchErc20Balances, fetchEthBalances } from "../api/alchemy"
import { log } from "../logger"

export class Erc20Chain implements IChain {
  token: Symbol
  private apiKey?: string
  private contractAddress?: string
  private decimals: number

  constructor(token: Symbol, apiKey: string, contractAddress?: string, decimals: number = 18) {
    this.token = token
    this.apiKey = apiKey
    this.contractAddress = contractAddress
    this.decimals = decimals
  }

  async getBalances(ctx: Context, addresses: string[]): Promise<AssetInfo[]> {
    if (addresses.length === 0) return []
    if (!this.apiKey) {
      log(ctx, "Error", "No Alchemy API Key provided")
      return addresses.map(addr => ({ address: addr, balance: 0, balanceFormatted: 0, value: 0 }))
    }

    try {
      log(ctx, "Info", `Fetching ${addresses.length} ${this.token.symbol.toUpperCase()} addresses`)
      let balanceMap: Map<string, number>

      if (!this.contractAddress) {
        // Native ETH
        balanceMap = await fetchEthBalances(this.apiKey, addresses)
      } else {
        // ERC20 Token
        balanceMap = await fetchErc20Balances(this.apiKey, addresses, this.contractAddress)
      }

      return addresses.map(addr => {
        const balance = balanceMap.get(addr) || 0
        return {
          address: addr,
          balance: balance,
          balanceFormatted: balance / Math.pow(10, this.decimals),
          value: 0
        }
      })
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      log(ctx, "Error", `Failed to fetch ${this.token.symbol} balances: ${msg}`)
      return addresses.map(addr => ({ address: addr, balance: 0, balanceFormatted: 0, value: 0 }))
    }
  }
}
