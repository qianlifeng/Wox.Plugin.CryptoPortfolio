export interface AssetInfo {
  address: string
  balance: number // Raw balance (Satoshi for BTC, Wei for ETH)
  balanceFormatted: number // Human readable balance (BTC, ETH)
  value: number // Fiat value
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

export interface BlockchainInfoResponse {
  [address: string]: {
    final_balance: number
  }
}
