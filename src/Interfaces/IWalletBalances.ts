import { IDictionary } from "./IDictionary";
import { IAsset } from "./IAsset";

export interface IWalletBalances {
  address: string,
  balances: IDictionary<string>
  assets?: IDictionary<IAsset>
}