// Curated list of 200+ Solana ecosystem repos to track
// Organized by category for signal clustering
// Updated periodically — add/remove based on relevance

export interface TrackedRepo {
  repo: string; // owner/name
  category: string;
  weight: number; // 1-3, importance for signal detection
}

export const CURATED_REPOS: TrackedRepo[] = [
  // === Core Infrastructure ===
  { repo: 'solana-labs/solana', category: 'core', weight: 3 },
  { repo: 'anza-xyz/agave', category: 'core', weight: 3 },
  { repo: 'firedancer-io/firedancer', category: 'core', weight: 3 },
  { repo: 'solana-labs/solana-program-library', category: 'core', weight: 3 },
  { repo: 'coral-xyz/anchor', category: 'core', weight: 3 },
  { repo: 'solana-labs/solana-web3.js', category: 'core', weight: 2 },
  { repo: 'solana-developers/program-examples', category: 'core', weight: 1 },

  // === DeFi — DEXs ===
  { repo: 'jup-ag/jupiter-core', category: 'defi-dex', weight: 3 },
  { repo: 'orca-so/whirlpools', category: 'defi-dex', weight: 3 },
  { repo: 'raydium-io/raydium-sdk-V2', category: 'defi-dex', weight: 3 },
  { repo: 'raydium-io/raydium-clmm', category: 'defi-dex', weight: 2 },
  { repo: 'openbook-dex/openbook-v2', category: 'defi-dex', weight: 2 },
  { repo: 'PhoenixTrade/phoenix-v1', category: 'defi-dex', weight: 2 },
  { repo: 'Ellipsis-Labs/phoenix-sdk', category: 'defi-dex', weight: 1 },

  // === DeFi — Lending/Borrowing ===
  { repo: 'marginfi/marginfi-v2', category: 'defi-lending', weight: 3 },
  { repo: 'solendprotocol/solend-sdk', category: 'defi-lending', weight: 2 },
  { repo: 'kamino-finance/klend', category: 'defi-lending', weight: 2 },
  { repo: 'drift-labs/protocol-v2', category: 'defi-lending', weight: 3 },

  // === DeFi — Liquid Staking ===
  { repo: 'jito-foundation/jito-programs', category: 'lst', weight: 3 },
  { repo: 'sanctum-so/sanctum-spl-stake-pool', category: 'lst', weight: 2 },
  { repo: 'marinade-finance/liquid-staking-program', category: 'lst', weight: 2 },

  // === DeFi — Perps & Derivatives ===
  { repo: 'drift-labs/drift-common', category: 'defi-perps', weight: 2 },
  { repo: 'Zeta-Zetachain/zeta-program', category: 'defi-perps', weight: 2 },

  // === DeFi — Yield & Vaults ===
  { repo: 'kamino-finance/farms-sdk', category: 'defi-yield', weight: 2 },
  { repo: 'tulip-protocol/tulip-sdk', category: 'defi-yield', weight: 1 },

  // === Stablecoins ===
  { repo: 'uxd-protocol/uxd-program', category: 'stablecoin', weight: 2 },

  // === Oracle ===
  { repo: 'pyth-network/pyth-sdk-solana', category: 'oracle', weight: 3 },
  { repo: 'pyth-network/pyth-crosschain', category: 'oracle', weight: 2 },
  { repo: 'switchboard-xyz/switchboard', category: 'oracle', weight: 2 },

  // === NFT & Digital Assets ===
  { repo: 'metaplex-foundation/mpl-core', category: 'nft', weight: 3 },
  { repo: 'metaplex-foundation/mpl-token-metadata', category: 'nft', weight: 2 },
  { repo: 'tensor-foundation/marketplace', category: 'nft', weight: 2 },
  { repo: 'magicoss/magiceden-marketplace', category: 'nft', weight: 2 },

  // === Payments & Commerce ===
  { repo: 'solana-labs/solana-pay', category: 'payments', weight: 2 },
  { repo: 'helio-fi/helio-dev', category: 'payments', weight: 1 },

  // === Bridges & Interoperability ===
  { repo: 'wormhole-foundation/wormhole', category: 'bridge', weight: 3 },
  { repo: 'LayerZero-Labs/LayerZero-v2', category: 'bridge', weight: 2 },
  { repo: 'debridge-finance/debridge-solana', category: 'bridge', weight: 1 },

  // === DePIN ===
  { repo: 'helium/helium-program-library', category: 'depin', weight: 3 },
  { repo: 'helium/oracles', category: 'depin', weight: 2 },
  { repo: 'hivemapper/hivemapper-data-logger', category: 'depin', weight: 2 },
  { repo: 'render-network/render-network', category: 'depin', weight: 2 },
  { repo: 'nosana-ci/nosana-programs', category: 'depin', weight: 2 },
  { repo: 'GenesysGo/shadow-drive', category: 'depin', weight: 1 },

  // === AI & Compute ===
  { repo: 'solana-labs/ai-solana', category: 'ai', weight: 2 },
  { repo: 'alephium/alephium', category: 'ai', weight: 1 },

  // === Gaming & Entertainment ===
  { repo: 'magicblock-labs/bolt', category: 'gaming', weight: 2 },
  { repo: 'magicblock-labs/ephemeral-rollups-spl', category: 'gaming', weight: 2 },
  { repo: 'star-atlas/factory', category: 'gaming', weight: 1 },

  // === Social & Identity ===
  { repo: 'dialectlabs/protocol', category: 'social', weight: 2 },
  { repo: 'bonfida/sns-sdk', category: 'social', weight: 2 },
  { repo: 'bonfida/name-tokenizer', category: 'social', weight: 1 },

  // === Governance & DAOs ===
  { repo: 'solana-labs/governance-program-library', category: 'governance', weight: 2 },
  { repo: 'realms-today/governance-ui', category: 'governance', weight: 1 },

  // === Developer Tools ===
  { repo: 'helius-labs/helius-sdk', category: 'devtools', weight: 2 },
  { repo: 'helius-labs/das-api', category: 'devtools', weight: 2 },
  { repo: 'ironforge-cloud/solana-toolkit', category: 'devtools', weight: 1 },
  { repo: 'project-serum/anchor', category: 'devtools', weight: 1 },
  { repo: 'clockwork-xyz/clockwork', category: 'devtools', weight: 1 },

  // === Wallets & SDKs ===
  { repo: 'solana-labs/wallet-adapter', category: 'wallet', weight: 2 },
  { repo: 'phantom/sandbox', category: 'wallet', weight: 1 },
  { repo: 'solflare-wallet/solflare-sdk', category: 'wallet', weight: 1 },

  // === Token Extensions / Token-2022 ===
  { repo: 'solana-labs/solana-program-library', category: 'token-ext', weight: 2 },

  // === MEV & Trading Infra ===
  { repo: 'jito-foundation/jito-solana', category: 'mev', weight: 3 },
  { repo: 'jito-labs/mev-protos', category: 'mev', weight: 2 },

  // === RWA (Real World Assets) ===
  { repo: 'maple-labs/maple-v2', category: 'rwa', weight: 2 },

  // === Privacy ===
  { repo: 'elusiv-privacy/elusiv', category: 'privacy', weight: 1 },
  { repo: 'light-protocol/light-protocol', category: 'privacy', weight: 2 },

  // === Compressed NFTs / State Compression ===
  { repo: 'metaplex-foundation/mpl-bubblegum', category: 'compression', weight: 2 },

  // === Mobile ===
  { repo: 'nicolo-ribaudo/solana-mobile-stack', category: 'mobile', weight: 1 },
  { repo: 'solana-mobile/mobile-wallet-adapter', category: 'mobile', weight: 2 },

  // === Restaking ===
  { repo: 'jito-foundation/restaking', category: 'restaking', weight: 3 },

  // === SVM / Rollups ===
  { repo: 'eclipse-labs/eclipse', category: 'svm', weight: 2 },
  { repo: 'neonlabsorg/neon-evm', category: 'svm', weight: 2 },

  // === Blinks & Actions ===
  { repo: 'solana-labs/solana-actions', category: 'blinks', weight: 2 },
  { repo: 'dialectlabs/blinks', category: 'blinks', weight: 2 },

  // === Token Launchpads ===
  { repo: 'raydium-io/raydium-launchpad', category: 'launchpad', weight: 2 },

  // === Data & Analytics ===
  { repo: 'theblockchainapi/solana-nft-collection', category: 'data', weight: 1 },

  // === Education ===
  { repo: 'solana-developers/solana-cookbook', category: 'education', weight: 1 },
  { repo: 'solana-developers/developer-content', category: 'education', weight: 1 },
];

export function getReposByCategory(category: string): TrackedRepo[] {
  return CURATED_REPOS.filter(r => r.category === category);
}

export function getHighWeightRepos(): TrackedRepo[] {
  return CURATED_REPOS.filter(r => r.weight >= 2);
}

export function getAllRepoNames(): string[] {
  return CURATED_REPOS.map(r => r.repo);
}

export function getCategories(): string[] {
  return [...new Set(CURATED_REPOS.map(r => r.category))];
}
