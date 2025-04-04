import { type Address, type Chain } from "viem";
import { encodeFunctionData, parseAbiItem } from "viem/utils";
import { BALANCER_API_URL, SWAP_KIND } from "./constants.js";
import {
  BalancerApi,
  Slippage,
  TokenAmount,
  Swap,
  Token,
  type ExactInQueryOutput,
  type SwapBuildCallInput,
  type SwapBuildOutputExactIn,
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

// Generates the swap call data for Balancer swap
export async function generateSwapCallData(
  amount: string,
  tokenIn: Token,
  tokenOut: Token,
  sender: Address,
  recipient: Address,
  chain: Chain,
  initialQuote: boolean
) {
  // API is used to fetch best swap paths from available liquidity across v2 and v3
  const balancerApi = new BalancerApi(BALANCER_API_URL, chain.id);

  // Setting to false since anytime the across recipient address is a contract, WETH will be received
  const wethIsEth = false;
  const deadline = BigInt(Date.now() + 1000 * 60 * 60); // 1 hour
  const slippage = Slippage.fromPercentage("1"); // 1%

  try {
    const swapAmount = TokenAmount.fromRawAmount(
      tokenIn,
      amount as `${number}`
    );

    const sorPaths = await balancerApi.sorSwapPaths.fetchSorSwapPaths({
      chainId: chain.id,
      tokenIn: tokenIn.address,
      tokenOut: tokenOut.address,
      swapKind: SWAP_KIND,
      swapAmount,
      // set to v2 initially for PoC to avoid signatures
      // can update for v3, if needed
      useProtocolVersion: 2,
    });

    logger.json("Balancer swap paths: ", sorPaths);

    // Swap object provides useful helpers for re-querying, building call, etc
    const swap = new Swap({
      chainId: chain.id,
      paths: sorPaths,
      swapKind: SWAP_KIND,
    });

    logger.json("Balancer swap: ", swap);

    // Get up to date swap result by querying onchain
    const updated = (await swap.query(
      chain.rpcUrls.default.http[0]
    )) as ExactInQueryOutput;

    logger.json("Balancer updated swap: ", updated);

    let buildInput: SwapBuildCallInput;
    // In v2 the sender/recipient can be set, in v3 it is always the msg.sender
    if (swap.protocolVersion === 2) {
      buildInput = {
        slippage,
        deadline,
        queryOutput: updated,
        wethIsEth,
        sender,
        recipient,
      };
    } else {
      buildInput = {
        slippage,
        deadline,
        queryOutput: updated,
        wethIsEth,
      };
    }

    logger.json("Balancer build input: ", buildInput);

    const callData = swap.buildCall(buildInput) as SwapBuildOutputExactIn;

    logger.step(
      `Balancer swap data for ${
        initialQuote ? "initial quote" : "updated quote"
      }`
    );
    logger.json("Swap data: ", {
      inputToken: swap.inputAmount.token.address,
      amount: swap.inputAmount.amount,
      outputToken: swap.outputAmount.token.address,
      amountOut: swap.outputAmount.amount,
      updatedAmountOut: updated.expectedAmountOut.amount,
      minAmountOut: callData.minAmountOut.amount,
      to: callData.to,
      callData: callData.callData,
      value: callData.value,
    });

    return callData;
  } catch (error) {
    console.error(error);
    throw error;
  }
}
