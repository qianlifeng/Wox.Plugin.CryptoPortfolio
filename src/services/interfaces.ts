import { Symbol } from "../constants"
import { AssetInfo } from "../types"

export type LogLevel = "Info" | "Warning" | "Error"

export interface Logger {
  log(level: LogLevel, message: string): void
}

export interface ICoinService {
  token: Symbol

  setLogger(logger: Logger): void

  /**
   * Fetch balances for the given addresses.
   * Returns a list of AssetInfo with balance and balanceFormatted populated.
   * Value calculation will be handled by the Manager using current prices.
   */
  getBalances(addresses: string[]): Promise<AssetInfo[]>
}
