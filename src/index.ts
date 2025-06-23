import { createAcrossClient } from "@across-protocol/app-sdk";
import dotenv from "dotenv";
import { formatUnits } from "viem";
import {
  generateApproveCallData,
  generateAddLiquidityCallData,
  generateDrainTokensCallData,
} from "./utils/transactions.js";
import {
  createUserWallet,
  createTransactionUrl,
  getBalance,
} from "./utils/helpers.js";
import { logger } from "./utils/logger.js";
import { type CrossChainMessage } from "./utils/types.js";
import {
  inputAmount,
  originChain,
  destinationChain,
  originDepositToken,
  balancerLpTokenOne,
  balancerLpTokenTwo,
  acrossMulticallHandler,
  balancerLpPool,
  balancerVault
} from "./config.js";
import { INTEGRATOR_ID } from "./utils/constants.js";

dotenv.config();

// Function to add liquidity to a Balancer pool crosschain using Across Protocol
async function executeAddLiquidity() {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("PRIVATE_KEY is not set");
  }

  // Origin chain RPC URL
  // If not provided, defaults to RPC URL for the origin chain
  const rpcUrl = process.env.RPC_URL || originChain.rpcUrls.default.http[0];
  if (!rpcUrl) {
    throw new Error("RPC_URL is not set");
  }

  try {
    logger.step("Initializing clients");
    // Create a wallet client using the origin chain to make Across deposit transaction
    const { client: walletClient, address: userAddress } = createUserWallet(
      privateKey,
      rpcUrl,
      originChain
    );

    // Check if user has enough balance to make the origin chain deposit
    const balance = await getBalance(
      originChain,
      userAddress,
      originDepositToken.address
    );
    if (balance < inputAmount) {
      throw new Error(
        `Insufficient balance. Required: ${formatUnits(
          inputAmount,
          originDepositToken.decimals
        )}, Available: ${formatUnits(balance, originDepositToken.decimals)}`
      );
    }
    logger.success(
      `Balance check passed. Available: ${formatUnits(balance, originDepositToken.decimals)}`
    );

    // sets up the AcrossClient and configures chains
    const client = createAcrossClient({
      integratorId: INTEGRATOR_ID,
      chains: [originChain, destinationChain],
    });

    logger.success("Clients initialized successfully");

    // Generates the initial liquidity add call data
    // This is used to estimate the gas for the liquidity add
    // The gas estimation is used for the Across bridge fee
    const initialLiquidityAddCallData = await generateAddLiquidityCallData(
      inputAmount.toString(),
      balancerLpTokenOne,
      balancerLpTokenTwo,
      destinationChain,
      true
    );

    // Define the transactions executed after bridge transaction
    const crossChainMessage: CrossChainMessage = {
      actions: [
        // Approve the vault contract to spend the input amount
        {
          target: balancerLpTokenOne.address,
          // Generate the approve call data
          callData: generateApproveCallData(
            balancerVault,
            inputAmount
          ),
          value: 0n,
          // we use the update function to update the calldata based on the output amount from the quote
          update: (updatedOutputAmount: bigint) => {
            return {
              callData: generateApproveCallData(
                balancerVault,
                updatedOutputAmount
              ),
            };
          },
        },
        {
          // Balancer contract address
          target: initialLiquidityAddCallData.to,
          // Generates the exchange call data
          callData: initialLiquidityAddCallData.callData,
          value: 0n,
          // we use the update function to update the calldata based on the output amount from the quote
          update: async (updatedOutputAmount: bigint) => {
            const updatedLiquidityAddCallData = await generateAddLiquidityCallData(
              updatedOutputAmount.toString(),
              balancerLpTokenOne,
              balancerLpTokenTwo,
              destinationChain,
              false
            );
            // For PoC purposes, throwing an error if the vault contract address changes
            // In production, the approval address could be updated. 
            // The exception is if the gas estimation could be significantly different
            if (updatedLiquidityAddCallData.to !== initialLiquidityAddCallData.to) {
              throw new Error("Vault contract address changed");
            }
            return {
              callData: updatedLiquidityAddCallData.callData,
            };
          },
        },
        {
          // Balancer contract address
          target: acrossMulticallHandler,
          // Generates the exchange call data
          callData: generateDrainTokensCallData(
            balancerLpPool,
            userAddress
          ),
          value: 0n,
        },
      ],
      // address to send the output token to if the liquidity add fails or any leftover tokens
      fallbackRecipient: userAddress,
    };

    // Retrieves a quote for the bridge with approval and liquidity add actions
    const quote = await client.getQuote({
      route: {
        originChainId: originChain.id,
        destinationChainId: destinationChain.id,
        inputToken: originDepositToken.address,
        outputToken: balancerLpTokenOne.address, // WETH on destination chain
      },
      inputAmount: inputAmount,
      crossChainMessage: crossChainMessage,
      recipient: acrossMulticallHandler,
    });

    logger.step("Quote fetched");
    logger.json("Quote parameters", quote.deposit);

    logger.step("Executing transactions");
    await client.executeQuote({
      walletClient,
      deposit: quote.deposit, // returned by `getQuote`
      onProgress: (progress) => {
        if (progress.step === "approve" && progress.status === "txSuccess") {
          // if approving an ERC20, you have access to the approval receipt
          const { txReceipt } = progress;
          logger.success(
            `Approve TX: ${createTransactionUrl(
              originChain,
              txReceipt.transactionHash
            )}`
          );
        }

        if (progress.step === "deposit" && progress.status === "txSuccess") {
          // once deposit is successful you have access to depositId and the receipt
          const { depositId, txReceipt } = progress;
          logger.success(
            `Deposit TX: ${createTransactionUrl(
              originChain,
              txReceipt.transactionHash
            )}`
          );
          logger.success(`Deposit ID: ${depositId}`);
        }

        if (progress.step === "fill" && progress.status === "txSuccess") {
          // if the fill is successful, you have access the following data
          const { txReceipt, actionSuccess } = progress;
          // actionSuccess is a boolean flag, telling us if your cross chain messages were successful
          logger.success(
            `Fill TX: ${createTransactionUrl(
              destinationChain,
              txReceipt.transactionHash
            )}`
          );
          logger.success(
            actionSuccess ? "Liquidity add completed successfully" : "Liquidity add failed"
          );
        }
      },
    });

    logger.step("Bridge transaction completed");
  } catch (error) {
    logger.error("Failed to execute liquidity add", error);
    throw error;
  }
}

executeAddLiquidity();
