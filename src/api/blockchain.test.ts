import axios from "axios"
import { fetchDogeBalances } from "./blockchain"

jest.mock("axios")

const mockedAxios = axios as jest.Mocked<typeof axios>

describe("fetchDogeBalances", () => {
  beforeEach(() => {
    mockedAxios.get.mockReset()
  })

  it("fetches final Dogecoin balances in koinu", async () => {
    mockedAxios.get.mockResolvedValue({
      data: [
        { address: "DAddressTwo", final_balance: 50000000 },
        { address: "DAddressOne", final_balance: 125000000 }
      ]
    })

    const balances = await fetchDogeBalances(["DAddressOne", "DAddressTwo"])

    expect(mockedAxios.get).toHaveBeenCalledTimes(1)
    expect(mockedAxios.get).toHaveBeenCalledWith("https://api.blockcypher.com/v1/doge/main/addrs/DAddressOne;DAddressTwo/balance", { timeout: 10000 })
    expect(balances.get("DAddressOne")).toBe(125000000)
    expect(balances.get("DAddressTwo")).toBe(50000000)
  })
})
