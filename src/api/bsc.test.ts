import axios from "axios"
import { fetchBnbBalances } from "./bsc"

jest.mock("axios")

const mockedAxios = axios as jest.Mocked<typeof axios>

describe("fetchBnbBalances", () => {
  beforeEach(() => {
    mockedAxios.post.mockReset()
  })

  it("fetches BSC native balances with a JSON-RPC batch", async () => {
    mockedAxios.post.mockResolvedValue({
      data: [
        { jsonrpc: "2.0", id: 1, result: "0xde0b6b3a7640000" },
        { jsonrpc: "2.0", id: 0, result: "0x1bc16d674ec80000" }
      ]
    })

    const addresses = ["0x1111111111111111111111111111111111111111", "0x2222222222222222222222222222222222222222"]
    const balances = await fetchBnbBalances(addresses)

    expect(mockedAxios.post).toHaveBeenCalledWith(
      "https://bsc-dataseed.bnbchain.org",
      [
        { jsonrpc: "2.0", method: "eth_getBalance", params: [addresses[0], "latest"], id: 0 },
        { jsonrpc: "2.0", method: "eth_getBalance", params: [addresses[1], "latest"], id: 1 }
      ],
      { timeout: 10000 }
    )
    expect(balances.get(addresses[0])).toBe(2e18)
    expect(balances.get(addresses[1])).toBe(1e18)
  })

  it("skips the request when no addresses are configured", async () => {
    await expect(fetchBnbBalances([])).resolves.toEqual(new Map())
    expect(mockedAxios.post).not.toHaveBeenCalled()
  })
})
