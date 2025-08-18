import { http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { createConfig } from 'wagmi';

export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  transports: {
    [baseSepolia.id]: http(),
  },
}); 