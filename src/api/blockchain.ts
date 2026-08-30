import axios from "axios"
import { BlockCypherAddressBalanceResponse, BlockchainInfoResponse } from "../types"

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

export async function fetchDogeBalances(addresses: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>()
  const batchSize = 3

  for (let start = 0; start < addresses.length; start += batchSize) {
    if (start > 0) {
      // Anonymous BlockCypher access is limited to three address lookups per second.
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    const batch = addresses.slice(start, start + batchSize)
    const encodedAddresses = batch.map(encodeURIComponent).join(";")
    const url = `https://api.blockcypher.com/v1/doge/main/addrs/${encodedAddresses}/balance`
    const response = await axios.get<BlockCypherAddressBalanceResponse | BlockCypherAddressBalanceResponse[]>(url, { timeout: REQUEST_TIMEOUT })
    const entries = Array.isArray(response.data) ? response.data : [response.data]

    entries.forEach(entry => result.set(entry.address, entry.final_balance || 0))
  }

  return result
}
