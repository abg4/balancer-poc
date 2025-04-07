import { base, arbitrum } from "viem/chains";
import { Token } from "@balancer/sdk";
import { parseUnits, type Address } from "viem";

/**
 * BALANCER CONFIGURATION
 *
 * This section contains information that Balancer already has in its UI.
 */

// Input amount to be used for bridge transaction.
// The amount is scaled to the inputToken's decimals (6 decimals for USDC).
const inputAmount = parseUnits("10", 6);

// Destination chain where funds are received and the Balancer swap is made.
const destinationChain = arbitrum;

// Token used as input for the Balancer swap on the destination chain.
const balancerTokenIn = new Token(
  destinationChain.id,
  "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  6,
  "USDC"
);

// Token used as output for the Balancer swap on the destination chain.
const balancerTokenOut = new Token(
  destinationChain.id,
  "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
  18,
  "WETH"
);

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
  address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as Address,
  decimals: 6,
};

export {
  inputAmount,
  originChain,
  destinationChain,
  originDepositToken,
  balancerTokenIn,
  balancerTokenOut,
  acrossMulticallHandler,
};
