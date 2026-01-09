import { PublicAPI, Context, NewContext } from "@wox-launcher/wox-plugin"
import { AssetInfo } from "../types"
import { BTC, ETH, USDT, USDC } from "../constants"
import { BtcService } from "../services/BtcService"
import { Erc20Service as Erc20Service } from "../services/Erc20Service"
import { PriceService } from "../services/PriceService"
import { ICoinService } from "../services/interfaces"

export interface PortfolioState {
  lastSyncTime: Date | null
  prices: {
    bitcoin: { [currency: string]: number }
    ethereum: { [currency: string]: number }
    tether?: { [currency: string]: number }
    "usd-coin"?: { [currency: string]: number }
  }
  assets: { [symbol: string]: AssetInfo[] }
  isSyncing: boolean
}

export class PortfolioManager {
  private api: PublicAPI
  private state: PortfolioState = {
    lastSyncTime: null,
    prices: { bitcoin: {}, ethereum: {} },
    assets: {},

    isSyncing: false
  }

  private priceService!: PriceService
  private coinServices: ICoinService[] = []
  private syncInterval: NodeJS.Timeout | null = null

  // Settings
  private currency: string = "USD"
  private minValue: number = 0
  private btcAddresses: string[] = []
  private erc20Addresses: string[] = []

  constructor(api: PublicAPI) {
    this.api = api
  }

  async init(ctx: Context, currency: string, minValue: number, btcAddresses: string[], ethAddresses: string[], etherscanApiKey: string, coingeckoApiKey: string) {
    this.currency = currency
    this.minValue = minValue
    this.btcAddresses = btcAddresses
    this.erc20Addresses = ethAddresses

    // Initialize Services
    this.priceService = new PriceService(this.api, coingeckoApiKey)

    // Services configuration
    this.coinServices = [
      new BtcService(),
      new Erc20Service(ETH, etherscanApiKey, undefined, 18),
      new Erc20Service(USDT, etherscanApiKey, "0xdac17f958d2ee523a2206206994597c13d831ec7", 6),
      new Erc20Service(USDC, etherscanApiKey, "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", 6)
    ]

    // Inject Logger
    this.coinServices.forEach(service => {
      service.setLogger({
        log: (level, message) => {
          this.api.Log(ctx, level, message)
        }
      })
    })

    // Initial State
    this.state.assets[BTC.symbol] = btcAddresses.map(a => ({ address: a, balance: 0, balanceFormatted: 0, value: 0 }))
    this.state.assets[ETH.symbol] = ethAddresses.map(a => ({ address: a, balance: 0, balanceFormatted: 0, value: 0 }))
    this.state.assets[USDT.symbol] = ethAddresses.map(a => ({ address: a, balance: 0, balanceFormatted: 0, value: 0 }))
    this.state.assets[USDC.symbol] = ethAddresses.map(a => ({ address: a, balance: 0, balanceFormatted: 0, value: 0 }))

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

  private listeners: ((success: boolean) => void)[] = []

  onSyncDone(callback: (success: boolean) => void) {
    this.listeners.push(callback)
  }

  startSyncLoop() {
    if (this.syncInterval) clearInterval(this.syncInterval)
    // Sync every 60 seconds
    this.syncInterval = setInterval(() => this.syncNow(NewContext()), 60000)
  }

  async syncNow(ctx: Context) {
    if (this.state.isSyncing) return
    this.state.isSyncing = true

    let success = false
    try {
      // 1. Fetch Prices & Balances in Parallel
      const [prices, ...balancesResults] = await Promise.all([
        this.priceService.fetchPrices(ctx, this.currency),
        ...this.coinServices.map(service => {
          // BTC uses BTC addresses, ETH and Tokens use ETH addresses
          const addrs = service.token.symbol === BTC.symbol ? this.btcAddresses : this.erc20Addresses
          return service.getBalances(addrs)
        })
      ])

      // 2. Update State
      this.state.prices = prices

      this.coinServices.forEach((service, index) => {
        this.state.assets[service.token.symbol] = balancesResults[index]
      })

      this.state.lastSyncTime = new Date()
      success = true
      this.api.Log(ctx, "Info", "Sync Finished at " + this.state.lastSyncTime)
    } catch (e) {
      success = false
      this.api.Log(ctx, "Error", "Sync Failed: " + e)
    } finally {
      this.state.isSyncing = false
      this.listeners.forEach(cb => cb(success))
    }
  }
}
