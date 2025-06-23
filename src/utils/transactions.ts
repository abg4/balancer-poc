import { createPublicClient, http, type Address, type Chain } from "viem";
import { encodeFunctionData, parseAbiItem } from "viem/utils";
import { BALANCER_API_URL } from "./constants.js";
import { acrossMulticallHandler, balancerPoolId } from "../config.js";
import {
  BalancerApi,
  Slippage,
  Token,
  AddLiquidityKind,
  type InputAmount,
  AddLiquidity,
} from "@balancer/sdk";
import { logger } from "./logger.js";

// Function to generate the calldata for the approve function
export function generateApproveCallData(spender: Address, amount: bigint) {
  // Generate the calldata for the approve function
  const approveCallData = encodeFunctionData({
    abi: [parseAbiItem("function approve(address spender, uint256 value)")],
    args: [spender, amount],
  });

  return approveCallData;
}

// Function to generate the calldata for the approve function
export function generateDrainTokensCallData(token: Address, recipient: Address) {
  // Generate the calldata for the approve function
  const approveCallData = encodeFunctionData({
    abi: [parseAbiItem("function drainLeftoverTokens(address token, address recipient)")],
    args: [token, recipient],
  });

  return approveCallData;
}

// Generates the liquidity add call data for Balancer liquidity add
export async function generateAddLiquidityCallData(
  amount: string,
  balancerLpTokenOne: Token,
  balancerLpTokenTwo: Token,
  chain: Chain,
  initialQuote: boolean,
) {
  // API is used to fetch best liquidity pool
  const balancerApi = new BalancerApi(BALANCER_API_URL, chain.id);
  const poolState = await balancerApi.pools.fetchPoolState(balancerPoolId);
  const addLiquidity = new AddLiquidity();

  const kind = AddLiquidityKind.Unbalanced as const;
  const amountsIn: InputAmount[] = [
    {
      address: balancerLpTokenOne.address,
      decimals: balancerLpTokenOne.decimals,
      rawAmount: BigInt(amount),
    },
    {
      address: balancerLpTokenTwo.address,
      decimals: balancerLpTokenTwo.decimals,
      rawAmount: 0n,
    },
  ];
  const input = { chainId: chain.id, rpcUrl: chain.rpcUrls.default.http[0], kind, amountsIn };
  const publicClient = createPublicClient({
    chain,
    transport: http(),
  });
  const blockNumber = await publicClient.getBlockNumber();
  const queryOutput = await addLiquidity.query(input, poolState, blockNumber);

  // Setting to false since anytime the across recipient address is a contract, WETH will be received
  const wethIsEth = false;
  const slippage = Slippage.fromPercentage("1"); // 1%

  try {
    const call = addLiquidity.buildCall({ 
      ...queryOutput, 
      slippage,
      wethIsEth,
      sender: acrossMulticallHandler,
      recipient: acrossMulticallHandler,
      userData: "0x",
    });

    logger.step(
      `Balancer add liquidity data for ${
        initialQuote ? "initial quote" : "updated quote"
      }`
    );
    logger.json("Add liquidity data: ", {
      inputToken: call.maxAmountsIn[0].token.address,
      amount: call.maxAmountsIn[0].amount,
      outputToken: call.maxAmountsIn[1].token.address,
      amountOut: call.maxAmountsIn[1].amount,
      maxAmountsIn: call.maxAmountsIn,
      to: call.to,
      callData: call.callData,
      value: call.value,
    });

    return call;
  } catch (error) {
    console.error(error);
    throw error;
  }
}
