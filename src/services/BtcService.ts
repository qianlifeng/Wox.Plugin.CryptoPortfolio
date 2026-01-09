import axios from "axios"
import { BTC } from "../constants"
import { AssetInfo, BlockchainInfoResponse } from "../types"
import { ICoinService, Logger, LogLevel } from "./interfaces"

export class BtcService implements ICoinService {
  token = BTC
  private logger?: Logger

  setLogger(logger: Logger): void {
    this.logger = logger
  }

  private log(level: LogLevel, message: string) {
    if (this.logger) {
      this.logger.log(level, message)
    } else {
      console.log(`[${level}] ${message}`)
    }
  }

  async getBalances(addresses: string[]): Promise<AssetInfo[]> {
    if (addresses.length === 0) return []

    // Blockchain.info limits: multiple addresses separated by |
    // Using https://blockchain.info/balance?active=addr1|addr2
    const active = addresses.join("|")
    const url = `https://blockchain.info/balance?active=${active}`

    try {
      const response = await axios.get<BlockchainInfoResponse>(url)
      const data = response.data

      return addresses.map(addr => {
        const info = data[addr]
        const balance = info ? info.final_balance : 0 // Satoshi
        return {
          address: addr,
          balance: balance,
          balanceFormatted: balance / 100000000,
          value: 0
        }
      })
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      this.log("Error", `Failed to fetch BTC balances: ${msg}`)
      return addresses.map(addr => ({
        address: addr,
        balance: 0,
        balanceFormatted: 0,
        value: 0
      }))
    }
  }
}
