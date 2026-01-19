import { WoxImage } from "@wox-launcher/wox-plugin"

export class Symbol {
  constructor(
    public symbol: string,
    public name: string,
    public logo: WoxImage
  ) {}
}

export interface AssetInfo {
  address: string
  balance: number // Raw balance (Satoshi for BTC, Wei for ETH)
  balanceFormatted: number // Human readable balance (BTC, ETH)
  value: number // Fiat value
  tags?: string[]
}

export interface AddressConfig {
  address: string
  tags: string[]
}

export interface Portfolio {
  totalValue: number
  currency: string
  btc: {
    price: number
    assets: AssetInfo[]
    totalBalance: number
    totalValue: number
  }
  eth: {
    price: number
    assets: AssetInfo[]
    totalBalance: number
    totalValue: number
  }
}

export interface CryptoPrices {
  bitcoin: { [currency: string]: number }
  ethereum: { [currency: string]: number }
  tether?: { [currency: string]: number }
  "usd-coin"?: { [currency: string]: number }
}

export interface ProcessedAssetData {
  totalVal: number
  totalBal: number
  processed: AssetInfo[]
  price: number
  decimals: number
}

// --- API Types ---

export interface AlchemyJsonRpcRequest {
  jsonrpc: "2.0"
  method: string
  params: unknown[]
  id: number
}

export interface AlchemyJsonRpcResponse {
  jsonrpc: "2.0"
  id: number
  result?: unknown
  error?: unknown
}

export interface AlchemyPrice {
  currency: string
  value: string
}

export interface AlchemyTokenPrice {
  symbol: string
  prices: AlchemyPrice[]
  error: unknown
}

export interface AlchemyPriceResponse {
  data: AlchemyTokenPrice[]
}

export interface AlchemyTokenBalanceResult {
  tokenBalances: {
    contractAddress: string
    tokenBalance: string // hex
  }[]
}

export interface BlockchainInfoResponse {
  [address: string]: {
    final_balance: number
  }
}
