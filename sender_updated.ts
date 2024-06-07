import { DirectSecp256k1Wallet } from "@cosmjs/proto-signing";
import { SigningStargateClient } from "@cosmjs/stargate";
import { readFileSync } from "fs";
import promptSync from "prompt-sync";

const privateKeyFilePath = "private_key.txt";
const addressesFilePath = "addr.txt";
const rpcEndpoint = "https://nillion-testnet.rpc.kjnodes.com";

const prompt = promptSync({ sigint: true });

async function loadPrivateKeys(filePath: string): Promise<string[]> {
  return readFileSync(filePath, "utf-8").split("\n").filter(Boolean);
}

async function loadAddresses(filePath: string): Promise<string[]> {
  return readFileSync(filePath, "utf-8").split("\n").filter(Boolean);
}

async function checkBalance(address: string, client: SigningStargateClient): Promise<number> {
  console.log(`Checking balance for address: ${address}`);
  try {
    const balance = await client.getBalance(address, "unil");
    console.log(`Balance for address ${address}: ${balance.amount}`);
    return parseInt(balance.amount, 10);
  } catch (error) {
    console.error(`Error checking balance for address ${address}:`, error);
    return 0;
  }
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendTokens() {
  const privateKeys = await loadPrivateKeys(privateKeyFilePath);
  const addresses = await loadAddresses(addressesFilePath);

  // Get the repeat count from the user
  const repeatCount = parseInt(prompt("Input how many transfers do you want: "), 10);
  if (isNaN(repeatCount) || repeatCount <= 0) {
    console.error("Invalid input. Please enter a positive number.");
    return;
  }

  const amount = { denom: "unil", amount: "10" }; // 0.00001 NIL

  for (const privateKey of privateKeys) {
    const wallet = await DirectSecp256k1Wallet.fromKey(Buffer.from(privateKey, 'hex'), "nillion");
    const [{ address }] = await wallet.getAccounts();
    const client = await SigningStargateClient.connectWithSigner(rpcEndpoint, wallet);

    const balance = await checkBalance(address, client);
    const totalAmountNeeded = 1 + 104; 

    if (balance < totalAmountNeeded * repeatCount) {
      console.log(`Insufficient funds for address ${address}. Balance: ${balance}, Needed: ${totalAmountNeeded * repeatCount}`);
      continue;
    }

    for (let i = 0; i < repeatCount; i++) {
      for (const recipient of addresses) {
        const fee = {
          amount: [{ denom: "unil", amount: "104" }], 
          gas: "200000",
        };
        try {
          const result = await client.sendTokens(address, recipient, [amount], fee, "");

          if (result.code !== undefined && result.code === 0) {
            console.log(`Sent ${amount.amount} ${amount.denom} from ${address} to ${recipient}: ${result.transactionHash}`);
          } else {
            console.error(`Failed to send tokens from ${address} to ${recipient}: ${result.rawLog}`);
          }
        } catch (error) {
          console.error(`Error sending tokens from ${address} to ${recipient}:`, error);
        }

        
        await delay(2000);
      }
    }
  }
}

sendTokens().catch(console.error);
