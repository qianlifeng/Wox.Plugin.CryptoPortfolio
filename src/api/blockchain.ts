import axios from "axios"
import { BlockchainInfoResponse } from "../types"

const REQUEST_TIMEOUT = 10000 // 10 seconds

export async function fetchBtcBalances(addresses: string[]): Promise<Map<string, number>> {
  if (addresses.length === 0) return new Map()

  const active = addresses.join("|")
  const url = `https://blockchain.info/balance?active=${active}`

  const response = await axios.get<BlockchainInfoResponse>(url, { timeout: REQUEST_TIMEOUT })
  const data = response.data
  const result = new Map<string, number>()

  addresses.forEach(addr => {
    const info = data[addr]
    const balance = info ? info.final_balance : 0
    result.set(addr, balance)
  })

  return result
}
