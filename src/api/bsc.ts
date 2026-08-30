import axios from "axios"
import { AlchemyJsonRpcRequest, AlchemyJsonRpcResponse } from "../types"

const BSC_MAINNET_RPC_URL = "https://bsc-dataseed.bnbchain.org"
const REQUEST_TIMEOUT = 10000

export async function fetchBnbBalances(addresses: string[]): Promise<Map<string, number>> {
  if (addresses.length === 0) return new Map()

  const batch: AlchemyJsonRpcRequest[] = addresses.map((address, index) => ({
    jsonrpc: "2.0",
    method: "eth_getBalance",
    params: [address, "latest"],
    id: index
  }))

  const response = await axios.post<AlchemyJsonRpcResponse[]>(BSC_MAINNET_RPC_URL, batch, { timeout: REQUEST_TIMEOUT })
  const result = new Map<string, number>()

  if (!Array.isArray(response.data)) return result

  response.data.forEach(item => {
    const address = addresses[item.id]
    if (address && typeof item.result === "string") {
      result.set(address, parseInt(item.result, 16))
    }
  })

  return result
}
