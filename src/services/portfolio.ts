import { Context, NewContext } from "@wox-launcher/wox-plugin"
import { AssetInfo, AddressConfig, CryptoPrices } from "../types"
import { BTC, ETH, USDT, USDC, STETH, SyncIntervalSeconds } from "../constants"
import { BtcChain } from "../chain/btc"
import { Erc20Chain } from "../chain/erc20"
import { IChain } from "../chain/chain"
import { fetchTokenPrices } from "../api/alchemy"
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
    prices: { bitcoin: {}, ethereum: {} },
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
    this.chains = [
      new BtcChain(),
      new Erc20Chain(ETH, alchemyApiKey, undefined, 18),
      new Erc20Chain(USDT, alchemyApiKey, "0xdac17f958d2ee523a2206206994597c13d831ec7", 6),
      new Erc20Chain(USDC, alchemyApiKey, "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", 6),
      new Erc20Chain(STETH, alchemyApiKey, "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84", 18)
    ]

    // Initial State
    this.state.assets[BTC.symbol] = btcAddresses.map(a => ({ address: a.address, balance: 0, balanceFormatted: 0, value: 0, tags: a.tags }))
    this.state.assets[ETH.symbol] = ethAddresses.map(a => ({ address: a.address, balance: 0, balanceFormatted: 0, value: 0, tags: a.tags }))
    this.state.assets[USDT.symbol] = ethAddresses.map(a => ({ address: a.address, balance: 0, balanceFormatted: 0, value: 0, tags: a.tags }))
    this.state.assets[USDC.symbol] = ethAddresses.map(a => ({ address: a.address, balance: 0, balanceFormatted: 0, value: 0, tags: a.tags }))
    this.state.assets[STETH.symbol] = ethAddresses.map(a => ({ address: a.address, balance: 0, balanceFormatted: 0, value: 0, tags: a.tags }))

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
      return { bitcoin: {}, ethereum: {} }
    }

    try {
      const data = await fetchTokenPrices(this.alchemyApiKey, ["BTC", "ETH", "USDT", "USDC", "STETH"])

      const prices: CryptoPrices = {
        bitcoin: {},
        ethereum: {},
        tether: {},
        "usd-coin": {},
        steth: {}
      }

      if (data && data.data && Array.isArray(data.data)) {
        data.data.forEach(item => {
          const symbol = item.symbol.toUpperCase()
          const priceEntry = item.prices && item.prices.find(p => p.currency === "usd")
          if (priceEntry) {
            const val = parseFloat(priceEntry.value)
            if (!isNaN(val)) {
              if (symbol === "BTC") prices.bitcoin[this.currency.toLowerCase()] = val
              if (symbol === "ETH") prices.ethereum[this.currency.toLowerCase()] = val
              if (symbol === "USDT") prices.tether![this.currency.toLowerCase()] = val
              if (symbol === "USDC") prices["usd-coin"]![this.currency.toLowerCase()] = val
              if (symbol === "STETH") prices.steth![this.currency.toLowerCase()] = val
            }
          }
        })
      }

      return prices
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      log(ctx, "Error", `Failed to fetch prices: ${msg}`)
      return { bitcoin: {}, ethereum: {} }
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
          // BTC uses BTC addresses, ETH and Tokens use ETH addresses
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
