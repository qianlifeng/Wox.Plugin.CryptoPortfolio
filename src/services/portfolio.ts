import { Context, NewContext } from "@wox-launcher/wox-plugin"
import { AssetInfo, AddressConfig, CryptoPrices } from "../types"
import { BTC, AllTokens, SyncIntervalSeconds } from "../constants"
import { BtcChain } from "../chain/btc"
import { Erc20Chain } from "../chain/erc20"
import { IChain } from "../chain/chain"
import { fetchTokenPricesBySymbol, fetchTokenPricesByAddress } from "../api/alchemy"
import { log } from "../logger"

export interface PortfolioState {
  lastSyncTime: Date | null
  prices: CryptoPrices
  assets: { [symbol: string]: AssetInfo[] }
  isSyncing: boolean
}

export class PortfolioService {
  private state: PortfolioState = {
    lastSyncTime: null,
    prices: {},
    assets: {},
    isSyncing: false
  }

  private chains: IChain[] = []
  private syncInterval: NodeJS.Timeout | null = null
  private alchemyApiKey: string = ""

  // Settings
  private currency: string = "USD"
  private minValue: number = 0
  private btcAddresses: AddressConfig[] = []
  private erc20Addresses: AddressConfig[] = []

  private listeners: ((success: boolean) => void)[] = []

  init(ctx: Context, currency: string, minValue: number, btcAddresses: AddressConfig[], ethAddresses: AddressConfig[], alchemyApiKey: string) {
    this.currency = currency
    this.minValue = minValue
    this.btcAddresses = btcAddresses
    this.erc20Addresses = ethAddresses
    this.alchemyApiKey = alchemyApiKey

    // Initialize chains
    this.chains = AllTokens.map(token => {
      if (token.symbol === BTC.symbol) return new BtcChain()
      return new Erc20Chain(token, alchemyApiKey, token.contractAddress, token.decimals)
    })

    // Initial State
    AllTokens.forEach(token => {
      this.state.assets[token.symbol] = (token.symbol === BTC.symbol ? btcAddresses : ethAddresses).map(a => ({ address: a.address, balance: 0, balanceFormatted: 0, value: 0, tags: a.tags }))
    })

    // Start Sync Loop
    this.startSyncLoop()
    // Trigger immediate sync
    this.syncNow(ctx)
  }

  getState(): PortfolioState {
    return this.state
  }

  getCurrency(): string {
    return this.currency
  }

  getMinValue(): number {
    return this.minValue
  }

  onSyncDone(callback: (success: boolean) => void) {
    this.listeners.push(callback)
  }

  startSyncLoop() {
    if (this.syncInterval) clearInterval(this.syncInterval)
    this.syncInterval = setInterval(() => this.syncNow(NewContext()), SyncIntervalSeconds * 1000)
  }

  stop() {
    if (this.syncInterval) {
      log(NewContext(), "Info", "Stopping sync loop")
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }

  private async fetchPrices(ctx: Context): Promise<CryptoPrices> {
    if (!this.alchemyApiKey) {
      log(ctx, "Error", "No Alchemy API Key provided")
      return {}
    }

    try {
      // 1. Fetch Prices: Split tokens into those with address and those without
      const addressTokens = AllTokens.filter(t => !!t.contractAddress)
      const symbolTokens = AllTokens.filter(t => !t.contractAddress)

      const erc20Addresses = addressTokens.map(t => t.contractAddress!)

      const [data, dataByAddress] = await Promise.all([
        fetchTokenPricesBySymbol(
          this.alchemyApiKey,
          symbolTokens.map(t => t.symbol.toUpperCase())
        ),
        fetchTokenPricesByAddress(this.alchemyApiKey, erc20Addresses)
      ])

      const prices: CryptoPrices = {}

      // Process Symbol Data (for tokens like BTC, ETH without contract address)
      if (data && data.data && Array.isArray(data.data)) {
        data.data.forEach(item => {
          const symbol = item.symbol.toUpperCase()
          const priceEntry = item.prices && item.prices.find(p => p.currency === "usd")
          if (priceEntry) {
            const val = parseFloat(priceEntry.value)
            if (!isNaN(val)) {
              // Find matching token by symbol (case-insensitive)
              const token = symbolTokens.find(t => t.symbol.toUpperCase() === symbol)
              if (token) {
                prices[token.symbol] = { [this.currency.toLowerCase()]: val }
              }
            }
          }
        })
      }

      // Process Address Data (for ERC20s)
      if (dataByAddress && dataByAddress.data && Array.isArray(dataByAddress.data)) {
        dataByAddress.data.forEach(item => {
          const priceEntry = item.prices && item.prices.find(p => p.currency === "usd")
          if (priceEntry) {
            const val = parseFloat(priceEntry.value)
            if (!isNaN(val)) {
              // Map address back to our symbol keys
              const token = addressTokens.find(t => t.contractAddress?.toLowerCase() === item.address?.toLowerCase())
              if (token) {
                if (!prices[token.symbol]) prices[token.symbol] = {}
                prices[token.symbol][this.currency.toLowerCase()] = val
              }
            }
          }
        })
      }

      return prices
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      log(ctx, "Error", `Failed to fetch prices: ${msg}`)
      return {}
    }
  }

  async syncNow(ctx: Context) {
    if (this.state.isSyncing) return
    this.state.isSyncing = true

    let success = false
    try {
      // 1. Fetch Prices & Balances in Parallel
      const [prices, ...balancesResults] = await Promise.all([
        this.fetchPrices(ctx),
        ...this.chains.map(chain => {
          const configAddrs = chain.token.symbol === BTC.symbol ? this.btcAddresses : this.erc20Addresses
          const addrs = configAddrs.map(c => c.address)

          return chain.getBalances(ctx, addrs).then(assets => {
            // Re-attach tags
            return assets.map(asset => {
              const config = configAddrs.find(c => c.address === asset.address)
              if (config) {
                asset.tags = config.tags
              }
              return asset
            })
          })
        })
      ])

      // 2. Update State
      this.state.prices = prices

      this.chains.forEach((chain, index) => {
        this.state.assets[chain.token.symbol] = balancesResults[index]
      })

      this.state.lastSyncTime = new Date()
      success = true
      log(ctx, "Info", "Sync Finished")
    } catch (e) {
      success = false
      log(ctx, "Error", "Sync Failed: " + e)
    } finally {
      this.state.isSyncing = false
      this.listeners.forEach(cb => cb(success))
    }
  }
}
