import { Context, Plugin, PluginInitParams, PublicAPI, Query, Result } from "@wox-launcher/wox-plugin"
import { PortfolioManager } from "./managers/PortfolioManager"
import { randomUUID } from "crypto"
import { BTC, ETH, USDT, USDC, Symbol } from "./constants"
import { ProcessedAssetData } from "./types"
import { exec } from "child_process"
import * as os from "os"

let api: PublicAPI
let manager: PortfolioManager
let loadingResultId: string = ""
let hasEthAssets = false
let missingEtherscanKey = false

export const plugin: Plugin = {
  init: async (ctx: Context, initParams: PluginInitParams) => {
    api = initParams.API
    manager = new PortfolioManager(api)

    manager.onSyncDone(async success => {
      if (loadingResultId) {
        if (!success) {
          const failedMsg = await api.GetTranslation(ctx, "sync_failed")
          await api.Notify(ctx, failedMsg)
          loadingResultId = ""
          return
        }

        const result = await api.GetUpdatableResult(ctx, loadingResultId)
        if (result) {
          await api.RefreshQuery(ctx, { PreserveSelectedIndex: false })
        }
        loadingResultId = ""
      }
    })

    await api.OnSettingChanged(ctx, async () => {
      await sync(ctx)
    })

    await sync(ctx)
  },

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  query: async (ctx: Context, query: Query): Promise<Result[]> => {
    const state = manager.getState()
    const currency = manager.getCurrency()
    const minValue = manager.getMinValue()

    // If not synced yet
    if (!state.lastSyncTime && state.isSyncing) {
      const resultId = randomUUID()
      loadingResultId = resultId
      return [
        {
          Id: resultId,
          Title: "i18n:loading",
          SubTitle: "i18n:fetching",
          Icon: { ImageType: "relative", ImageData: "images/app.png" },
          Actions: []
        }
      ]
    }

    // Reset waiting ID if we are rendering results
    loadingResultId = ""

    const currencyKey = currency.toLowerCase()
    const btcPrice = state.prices.bitcoin?.[currencyKey] || 0
    const ethPrice = state.prices.ethereum?.[currencyKey] || 0
    const usdtPrice = state.prices.tether?.[currencyKey] || 0
    const usdcPrice = state.prices["usd-coin"]?.[currencyKey] || 0

    const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency: currency })

    // Helper to process assets
    const processAssets = (token: Symbol, price: number, decimals: number = 4): ProcessedAssetData => {
      const assets = state.assets[token.symbol] || []
      let totalVal = 0
      let totalBal = 0
      const processed = assets.map(a => {
        const val = a.balanceFormatted * price
        totalVal += val
        totalBal += a.balanceFormatted
        return { ...a, value: val }
      })
      return { totalVal, totalBal, processed, price, decimals }
    }

    const btcData = processAssets(BTC, btcPrice, 4)
    const ethData = processAssets(ETH, ethPrice, 2)
    const usdtData = processAssets(USDT, usdtPrice, 1)
    const usdcData = processAssets(USDC, usdcPrice, 1)

    const totalValue = btcData.totalVal + ethData.totalVal + usdtData.totalVal + usdcData.totalVal

    const results: Result[] = []

    // 1. Total Summary
    const tNever = await api.GetTranslation(ctx, "status_never")
    const tSyncing = await api.GetTranslation(ctx, "status_syncing")

    let timeStr = state.lastSyncTime ? state.lastSyncTime.toLocaleTimeString() : tNever
    if (state.isSyncing) timeStr += tSyncing

    const btcPct = totalValue > 0 ? (btcData.totalVal / totalValue) * 100 : 0
    const ethPct = totalValue > 0 ? (ethData.totalVal / totalValue) * 100 : 0
    const otherPct = totalValue > 0 ? ((usdtData.totalVal + usdcData.totalVal) / totalValue) * 100 : 0

    // Fetch translations
    const tTotal = await api.GetTranslation(ctx, "total")
    const tUpdated = await api.GetTranslation(ctx, "updated")
    const tSubTpl = "BTC: %s% · ETH: %s% · Stable: %s%"

    // Simple format implementation
    const formatStr = (str: string, ...args: string[]) => {
      let i = 0
      return str.replace(/%s/g, () => args[i++] || "")
    }

    const subTitle = formatStr(tSubTpl, btcPct.toFixed(1), ethPct.toFixed(1), otherPct.toFixed(1))

    if (hasEthAssets && missingEtherscanKey) {
      results.push({
        Title: "i18n:etherscan_key_required",
        SubTitle: "i18n:etherscan_key_missing_desc",
        Icon: { ImageType: "emoji", ImageData: "⚠️" },
        Group: "i18n:summary",
        GroupScore: 100,
        Actions: [
          {
            Name: "i18n:get_etherscan_key",
            Action: async () => {
              openUrl(ctx, "https://etherscan.io/myapikey")
            }
          }
        ]
      })
    }

    results.push({
      Title: `${tTotal}: ${formatter.format(totalValue)}`,
      SubTitle: subTitle,
      Group: "i18n:summary",
      GroupScore: 100,
      Icon: { ImageType: "emoji", ImageData: "💰" },
      Tails: [{ Type: "text", Text: `${tUpdated}: ${timeStr}` }],
      Actions: [
        {
          Name: "i18n:refresh",
          Icon: { ImageType: "emoji", ImageData: "🔄" },
          PreventHideAfterAction: true,
          Action: async (ctx: Context) => {
            await manager.syncNow(ctx)
            await api.RefreshQuery(ctx, { PreserveSelectedIndex: true })
          }
        }
      ]
    })

    // Helper to add results
    const addResults = (data: ProcessedAssetData, token: Symbol, score: number) => {
      if (data.processed.length > 0) {
        data.processed.forEach(a => {
          if (data.totalVal === 0) return
          if (a.value < minValue) return

          results.push({
            Title: `${a.balanceFormatted.toFixed(data.decimals)} ${token.symbol.toUpperCase()}`,
            SubTitle: a.address,
            Group: `${token.name} · ${data.totalBal.toFixed(data.decimals)} · $${data.totalVal.toFixed(0)} `,
            GroupScore: score,
            Icon: token.logo,
            Tails: [{ Type: "text", Text: formatter.format(a.value) }],
            Actions: [
              {
                Name: "i18n:copy",
                Icon: { ImageType: "emoji", ImageData: "📋" },
                Action: async ctx => {
                  await api.Copy(ctx, { type: "text", text: a.address })
                  const msg = (await api.GetTranslation(ctx, "copied")) || "Copied"
                  await api.Notify(ctx, msg)
                }
              }
            ]
          })
        })
      }
    }

    addResults(btcData, BTC, 90)
    addResults(ethData, ETH, 80)
    addResults(usdtData, USDT, 70)
    addResults(usdcData, USDC, 60)

    return results
  }
}

async function sync(ctx: Context) {
  await api.Log(ctx, "Info", "Start syncing")
  const currency = (await api.GetSetting(ctx, "currency")) || "USD"
  const btcAddressesStr = (await api.GetSetting(ctx, "btc_addresses")) || ""
  const ethAddressesStr = (await api.GetSetting(ctx, "eth_addresses")) || ""
  const etherscanApiKey = (await api.GetSetting(ctx, "etherscan_api_key")) || ""
  const coingeckoApiKey = (await api.GetSetting(ctx, "coingecko_api_key")) || ""
  const minValueStr = (await api.GetSetting(ctx, "min_value")) || "0"
  const minValue = parseFloat(minValueStr)

  const btcAddresses = parseAddresses(btcAddressesStr)
  const ethAddresses = parseAddresses(ethAddressesStr)
  await api.Log(ctx, "Info", `BTC Addresses: ${btcAddresses.length}, ETH Addresses: ${ethAddresses.length}`)

  hasEthAssets = ethAddresses.length > 0
  missingEtherscanKey = etherscanApiKey.trim() === ""

  await manager.init(ctx, currency, minValue, btcAddresses, ethAddresses, etherscanApiKey, coingeckoApiKey)
  await api.Log(ctx, "Info", "Synced")
}

function parseAddresses(input: string): string[] {
  return input
    .split(/[\n,]/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
}

function openUrl(ctx: Context, url: string) {
  const platform = os.platform()
  let command = ""

  switch (platform) {
    case "win32":
      command = `start "" "${url}"`
      break
    case "darwin":
      command = `open "${url}"`
      break
    case "linux":
      command = `xdg-open "${url}"`
      break
    default:
      api.Log(ctx, "Error", `Unsupported platform: ${platform}`)
      return
  }

  exec(command)
}
