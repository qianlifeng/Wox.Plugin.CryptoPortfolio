import { WoxImage } from "@wox-launcher/wox-plugin"

export class Symbol {
  constructor(
    public symbol: string,
    public name: string,
    public logo: WoxImage,
    public contractAddress?: string,
    public decimals: number = 18,
    public displayDecimals: number = 4,
    public group?: string
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
  [symbol: string]: { [currency: string]: number }
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
  address?: string
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
