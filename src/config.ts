import { base, arbitrum } from "viem/chains";
import { Token } from "@balancer/sdk";
import { parseUnits, type Address } from "viem";

// Input amount to be used for bridge transaction
// Amount scaled to inputToken decimals (6 decimals for USDC)
const inputAmount = parseUnits("10", 6);

// Origin chain where Across deposit is made by user
const originChain = base;

// Destination chain where funds are received and Balancer swap is made
const destinationChain = arbitrum;

// Across multicall handler address
// Addresses are here: https://docs.across.to/reference/contract-addresses
const acrossMulticallHandler = "0x924a9f036260ddd5808007e1aa95f08ed08aa569";

// Origin deposit token used for Across deposit
// Should be the same asset (USDC, WETH, WBTC, etc.) as the balancerTokenIn
const originDepositToken =
  "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as Address;

// Token used as input for Balancer swap on destination chain
const balancerTokenIn = new Token(
  destinationChain.id,
  "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  6,
  "USDC"
);

// Token used as output for Balancer swap on destination chain
const balancerTokenOut = new Token(
  destinationChain.id,
  "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
  18,
  "WETH"
);

export {
  inputAmount,
  originChain,
  destinationChain,
  originDepositToken,
  balancerTokenIn,
  balancerTokenOut,
  acrossMulticallHandler,
};
