import axios from "axios"
import { AssetInfo } from "../types"
import { Symbol } from "../constants"
import { ICoinService, Logger, LogLevel } from "./interfaces"

interface EtherscanResponse {
  status: string
  message: string
  result: unknown
}

export class Erc20Service implements ICoinService {
  token: Symbol
  private logger?: Logger
  private apiKey?: string
  private contractAddress?: string
  private decimals: number

  constructor(token: Symbol, apiKey: string, contractAddress?: string, decimals: number = 18) {
    this.token = token
    this.apiKey = apiKey
    this.contractAddress = contractAddress
    this.decimals = decimals
  }

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
    if (!this.apiKey) return []

    // Check if Native ETH (no contract address) or Token
    if (!this.contractAddress) {
      return this.getNativeBalances(addresses)
    } else {
      return this.getTokenBalances(addresses)
    }
  }

  private async getNativeBalances(addresses: string[]): Promise<AssetInfo[]> {
    // Etherscan Batch Request for Native ETH
    let url = "https://api.etherscan.io/v2/api?chainid=1&module=account&action=balancemulti&tag=latest"
    const addressStr = addresses.join(",")
    url += `&address=${addressStr}`

    if (this.apiKey) {
      url += `&apikey=${this.apiKey}`
    }

    try {
      const response = await axios.get<EtherscanResponse>(url)
      const data = response.data

      this.log("Info", `[Erc20Service-${this.token.symbol}] Response Status: ${data.status}`)

      if (data.status !== "1") {
        this.log("Error", `[Erc20Service-${this.token.symbol}] Error: ${data.message}`)
        return addresses.map(addr => ({ address: addr, balance: 0, balanceFormatted: 0, value: 0 }))
      }

      // data.result is array of { account: string, balance: string }
      const resultMap = new Map<string, string>()
      const results = data.result as Array<{ account: string; balance: string }>
      results.forEach(r => resultMap.set(r.account.toLowerCase(), r.balance))

      return addresses.map(addr => {
        const balStr = resultMap.get(addr.toLowerCase()) || "0"
        let bal = parseFloat(balStr)
        if (isNaN(bal)) bal = 0
        return {
          address: addr,
          balance: bal,
          balanceFormatted: bal / Math.pow(10, this.decimals), // Usually 18 for ETH
          value: 0
        }
      })
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      this.log("Error", `[Erc20Service-${this.token.symbol}] Request failed: ${msg}`)
      return addresses.map(addr => ({ address: addr, balance: 0, balanceFormatted: 0, value: 0 }))
    }
  }

  private async getTokenBalances(addresses: string[]): Promise<AssetInfo[]> {
    this.log("Info", `[Erc20Service-${this.token.symbol}] Fetching token balances for ${addresses.length} addresses`)
    const results: AssetInfo[] = []

    // Etherscan Loop for Tokens
    for (const addr of addresses) {
      const url = `https://api.etherscan.io/v2/api?chainid=1&module=account&action=tokenbalance&contractaddress=${this.contractAddress}&address=${addr}&tag=latest&apikey=${this.apiKey}`
      try {
        // Rate limit protection
        await new Promise(r => setTimeout(r, 1000))

        const response = await axios.get<EtherscanResponse>(url)
        const data = response.data

        if (data.status === "1") {
          const balance = parseFloat(data.result as string)
          results.push({
            address: addr,
            balance: balance,
            balanceFormatted: balance / Math.pow(10, this.decimals),
            value: 0
          })
        } else {
          // Token balance 0 often returns 0 directly, sometimes status 0 if invalid? Usually status 1 with result 0.
          // Log warning only if it looks like a real error
          if (data.message !== "OK" && data.result !== "0") {
            this.log("Warning", `[Erc20Service-${this.token.symbol}] Failed for ${addr}: ${data.message}`)
          }
          let val = parseFloat((data.result as string) || "0")
          if (isNaN(val)) val = 0

          results.push({
            address: addr,
            balance: val,
            balanceFormatted: val / Math.pow(10, this.decimals),
            value: 0
          })
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        this.log("Error", `[Erc20Service-${this.token.symbol}] Error for ${addr}: ${msg}`)
        results.push({ address: addr, balance: 0, balanceFormatted: 0, value: 0 })
      }
    }
    return results
  }
}
