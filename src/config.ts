import { base, arbitrum } from "viem/chains";
import { Token } from "@balancer/sdk";
import { parseUnits, type Address } from "viem";

/**
 * BALANCER CONFIGURATION
 *
 * This section contains information that Balancer already has in its UI.
 */

// Input amount to be used for bridge transaction.
// The amount is scaled to the inputToken's decimals (18 decimals for WETH).
const inputAmount = parseUnits("0.005", 18);

// Destination chain where funds are received and the Balancer LiquidityAdd is made.
const destinationChain = arbitrum;

// Token used as input for the Balancer LiquidityAdd on the destination chain.
const balancerLpTokenOne = new Token(
  destinationChain.id,
  "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
  18,
  "WETH"
);

const balancerLpTokenTwo = new Token(
  destinationChain.id,
  "0xEC70Dcb4A1EFa46b8F2D97C310C9c4790ba5ffA8",
  18,
  "rETH"
);

const balancerLpPool = "0xd0EC47c54cA5e20aaAe4616c25C825c7f48D4069" as `0x${string}`;
const balancerPoolId = "0xd0ec47c54ca5e20aaae4616c25c825c7f48d40690000000000000000000004ef" as `0x${string}`;
const balancerVault = "0xBA12222222228d8Ba445958a75a0704d566BF2C8" as `0x${string}`;

/**
 * ACROSS CONFIGURATION
 *
 * This section contains new parameters to use for Across.
 */

// Origin chain where the Across deposit is made by the user.
const originChain = base;

// Across multicall handler address.
// Addresses can be found here: https://docs.across.to/reference/contract-addresses
const acrossMulticallHandler = "0x924a9f036260ddd5808007e1aa95f08ed08aa569";

// Origin deposit token used for the Across deposit.
// This should be the same asset (USDC, WETH, WBTC, etc.) as the balancerTokenIn.
const originDepositToken = {
  address: "0x4200000000000000000000000000000000000006" as Address,
  decimals: 18,
};

export {
  inputAmount,
  originChain,
  destinationChain,
  originDepositToken,
  balancerLpTokenOne,
  balancerLpTokenTwo,
  balancerLpPool,
  balancerVault,
  balancerPoolId,
  acrossMulticallHandler,
};
