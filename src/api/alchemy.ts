import axios from "axios"
import { AlchemyPriceResponse, AlchemyJsonRpcRequest, AlchemyJsonRpcResponse, AlchemyTokenBalanceResult } from "../types"

export const ALCHEMY_PRICES_API_BASE = "https://api.g.alchemy.com/prices/v1"
const REQUEST_TIMEOUT = 10000 // 10 seconds

export async function fetchTokenPricesBySymbol(apiKey: string, symbols: string[]): Promise<AlchemyPriceResponse> {
  // Alchemy API expects symbols as repeated query params: symbols=BTC&symbols=ETH
  const params = new URLSearchParams()
  symbols.forEach(s => params.append("symbols", s))
  const url = `${ALCHEMY_PRICES_API_BASE}/${apiKey}/tokens/by-symbol?${params.toString()}`
  const response = await axios.get<AlchemyPriceResponse>(url, { timeout: REQUEST_TIMEOUT })
  return response.data
}

export async function fetchTokenPricesByAddress(apiKey: string, addresses: string[]): Promise<AlchemyPriceResponse> {
  const url = `${ALCHEMY_PRICES_API_BASE}/${apiKey}/tokens/by-address`
  const body = {
    addresses: addresses.map(addr => ({ network: "eth-mainnet", address: addr }))
  }
  const response = await axios.post<AlchemyPriceResponse>(url, body, { timeout: REQUEST_TIMEOUT })
  return response.data
}

export async function fetchEthBalances(apiKey: string, addresses: string[]): Promise<Map<string, number>> {
  const url = `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`
  const batch: AlchemyJsonRpcRequest[] = addresses.map((addr, index) => ({
    jsonrpc: "2.0",
    method: "eth_getBalance",
    params: [addr, "latest"],
    id: index
  }))

  const response = await axios.post<AlchemyJsonRpcResponse[]>(url, batch, { timeout: REQUEST_TIMEOUT })
  const result = new Map<string, number>()

  if (!response.data || !Array.isArray(response.data)) return result

  response.data.forEach(res => {
    const addr = addresses[res.id]
    if (addr && res.result) {
      result.set(addr, parseInt(res.result as string, 16))
    }
  })
  return result
}

export async function fetchErc20Balances(apiKey: string, addresses: string[], contractAddress: string): Promise<Map<string, number>> {
  const url = `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`
  const batch: AlchemyJsonRpcRequest[] = addresses.map((addr, index) => ({
    jsonrpc: "2.0",
    method: "alchemy_getTokenBalances",
    params: [addr, [contractAddress]],
    id: index
  }))

  const response = await axios.post<AlchemyJsonRpcResponse[]>(url, batch, { timeout: REQUEST_TIMEOUT })
  const result = new Map<string, number>()

  if (!response.data || !Array.isArray(response.data)) return result

  response.data.forEach(res => {
    const addr = addresses[res.id]
    if (addr && res.result) {
      const tokenRes = res.result as AlchemyTokenBalanceResult
      if (tokenRes.tokenBalances && tokenRes.tokenBalances.length > 0) {
        const bal = tokenRes.tokenBalances[0].tokenBalance
        if (bal && bal !== "0x") {
          result.set(addr, parseInt(bal, 16))
        }
      }
    }
  })
  return result
}
