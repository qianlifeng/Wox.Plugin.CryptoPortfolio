import { Context } from "@wox-launcher/wox-plugin"
import { AssetInfo, Symbol } from "../types"

export interface IChain {
  token: Symbol

  /**
   * Fetch balances for the given addresses.
   * Returns a list of AssetInfo with balance and balanceFormatted populated.
   * Value calculation will be handled by PortfolioService using current prices.
   */
  getBalances(ctx: Context, addresses: string[]): Promise<AssetInfo[]>
}
