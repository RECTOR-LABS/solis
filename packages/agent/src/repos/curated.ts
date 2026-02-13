// Curated list of Solana ecosystem repos to track
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
  { repo: 'solana-labs/rbpf', category: 'core', weight: 2 },
  { repo: 'anza-xyz/pinocchio', category: 'core', weight: 2 },
  { repo: 'anza-xyz/kit', category: 'core', weight: 2 },
  { repo: 'anza-xyz/platform-tools', category: 'core', weight: 1 },
  { repo: 'solana-labs/solana-perf-libs', category: 'core', weight: 1 },
  { repo: 'solana-developers/program-examples', category: 'core', weight: 1 },

  // === DeFi — DEXs ===
  { repo: 'jup-ag/jupiter-cpi', category: 'defi-dex', weight: 3 },
  { repo: 'orca-so/whirlpools', category: 'defi-dex', weight: 3 },
  { repo: 'raydium-io/raydium-sdk-V2', category: 'defi-dex', weight: 3 },
  { repo: 'raydium-io/raydium-clmm', category: 'defi-dex', weight: 2 },
  { repo: 'raydium-io/raydium-cp-swap', category: 'defi-dex', weight: 2 },
  { repo: 'openbook-dex/openbook-v2', category: 'defi-dex', weight: 2 },
  { repo: 'Ellipsis-Labs/phoenix-v1', category: 'defi-dex', weight: 2 },
  { repo: 'jup-ag/jupiter-swap-api-client', category: 'defi-dex', weight: 2 },
  { repo: 'MeteoraAg/dlmm-sdk', category: 'defi-dex', weight: 2 },
  { repo: 'Ellipsis-Labs/phoenix-sdk', category: 'defi-dex', weight: 1 },

  // === DeFi — Lending/Borrowing ===
  { repo: 'mrgnlabs/marginfi-v2', category: 'defi-lending', weight: 3 },
  { repo: 'drift-labs/protocol-v2', category: 'defi-lending', weight: 3 },
  { repo: 'solendprotocol/solend-sdk', category: 'defi-lending', weight: 2 },
  { repo: 'Kamino-Finance/klend', category: 'defi-lending', weight: 2 },
  { repo: 'hubbleprotocol/hubble-common', category: 'defi-lending', weight: 2 },

  // === DeFi — Liquid Staking ===
  { repo: 'jito-foundation/jito-programs', category: 'lst', weight: 3 },
  { repo: 'sanctum-so/sanctum-lst-list', category: 'lst', weight: 2 },
  { repo: 'marinade-finance/liquid-staking-program', category: 'lst', weight: 2 },
  { repo: 'jito-foundation/stakenet', category: 'lst', weight: 2 },
  { repo: 'marinade-finance/marinade-ts-sdk', category: 'lst', weight: 1 },

  // === DeFi — Perps & Derivatives ===
  { repo: 'drift-labs/drift-common', category: 'defi-perps', weight: 2 },
  { repo: 'zetamarkets/zeta-program', category: 'defi-perps', weight: 2 },

  // === DeFi — Yield & Vaults ===
  { repo: 'Kamino-Finance/farms-sdk', category: 'defi-yield', weight: 2 },
  { repo: 'drift-labs/drift-vaults', category: 'defi-yield', weight: 2 },
  { repo: 'Kamino-Finance/kliquidity-sdk', category: 'defi-yield', weight: 1 },

  // === Oracle ===
  { repo: 'pyth-network/pyth-crosschain', category: 'oracle', weight: 3 },
  { repo: 'pyth-network/pyth-sdk-rs', category: 'oracle', weight: 2 },
  { repo: 'switchboard-xyz/switchboard', category: 'oracle', weight: 2 },
  { repo: 'switchboard-xyz/on-demand', category: 'oracle', weight: 2 },

  // === NFT & Digital Assets ===
  { repo: 'metaplex-foundation/mpl-core', category: 'nft', weight: 3 },
  { repo: 'metaplex-foundation/mpl-token-metadata', category: 'nft', weight: 2 },
  { repo: 'metaplex-foundation/umi', category: 'nft', weight: 2 },
  { repo: 'tensor-foundation/marketplace', category: 'nft', weight: 2 },
  { repo: 'tensor-foundation/toolkit', category: 'nft', weight: 2 },
  { repo: 'magicoss/mmm', category: 'nft', weight: 2 },

  // === Payments & Commerce ===
  { repo: 'solana-labs/solana-pay', category: 'payments', weight: 2 },
  { repo: 'TipLink/tiplink-open-source', category: 'payments', weight: 1 },

  // === Bridges & Interoperability ===
  { repo: 'wormhole-foundation/wormhole', category: 'bridge', weight: 3 },
  { repo: 'LayerZero-Labs/LayerZero-v2', category: 'bridge', weight: 2 },
  { repo: 'mayan-finance/swap-sdk', category: 'bridge', weight: 1 },
  { repo: 'debridge-finance/dln-contracts', category: 'bridge', weight: 1 },

  // === DePIN ===
  { repo: 'helium/helium-program-library', category: 'depin', weight: 3 },
  { repo: 'helium/oracles', category: 'depin', weight: 2 },
  { repo: 'hivemapper/hivemapper-data-logger', category: 'depin', weight: 2 },
  { repo: 'nosana-ci/nosana-programs', category: 'depin', weight: 2 },
  { repo: 'GenesysGo/shadow-drive', category: 'depin', weight: 1 },

  // === Gaming & Entertainment ===
  { repo: 'magicblock-labs/bolt', category: 'gaming', weight: 2 },
  { repo: 'magicblock-labs/ephemeral-rollups-spl', category: 'gaming', weight: 2 },
  { repo: 'regolith-labs/ore', category: 'gaming', weight: 1 },

  // === Social & Identity ===
  { repo: 'dialectlabs/protocol', category: 'social', weight: 2 },
  { repo: 'coral-xyz/backpack', category: 'social', weight: 2 },
  { repo: 'bonfida/sns-sdk', category: 'social', weight: 2 },
  { repo: 'bonfida/name-tokenizer', category: 'social', weight: 1 },

  // === Governance & DAOs ===
  { repo: 'Squads-Protocol/v4', category: 'governance', weight: 3 },
  { repo: 'solana-labs/governance-program-library', category: 'governance', weight: 2 },
  { repo: 'solana-labs/governance-ui', category: 'governance', weight: 1 },
  { repo: 'solana-foundation/solana-improvement-documents', category: 'governance', weight: 1 },

  // === Developer Tools ===
  { repo: 'rpcpool/yellowstone-grpc', category: 'devtools', weight: 2 },
  { repo: 'helius-labs/helius-sdk', category: 'devtools', weight: 2 },
  { repo: 'helius-labs/helius-rust-sdk', category: 'devtools', weight: 2 },
  { repo: 'sevenlabs-hq/carbon', category: 'devtools', weight: 1 },
  { repo: 'metaplex-foundation/shank', category: 'devtools', weight: 1 },
  { repo: 'kklas/anchor-client-gen', category: 'devtools', weight: 1 },
  { repo: 'solana-labs/solana-accountsdb-plugin-postgres', category: 'devtools', weight: 1 },
  { repo: 'Ellipsis-Labs/solana-verifiable-build', category: 'devtools', weight: 1 },
  { repo: 'Ackee-Blockchain/trident', category: 'devtools', weight: 1 },
  { repo: 'solana-playground/solana-playground', category: 'devtools', weight: 1 },
  { repo: 'clockwork-xyz/clockwork', category: 'devtools', weight: 1 },

  // === Wallets & SDKs ===
  { repo: 'solana-labs/wallet-adapter', category: 'wallet', weight: 2 },
  { repo: 'phantom/sandbox', category: 'wallet', weight: 1 },
  { repo: 'solflare-wallet/solflare-sdk', category: 'wallet', weight: 1 },

  // === Stablecoin Infrastructure ===
  { repo: 'MeteoraAg/damm-v1-sdk', category: 'stablecoin', weight: 2 },

  // === MEV & Trading Infra ===
  { repo: 'jito-foundation/jito-solana', category: 'mev', weight: 3 },
  { repo: 'jito-labs/mev-protos', category: 'mev', weight: 2 },
  { repo: 'jito-foundation/jito-tip-router', category: 'mev', weight: 2 },
  { repo: 'jito-labs/searcher-examples', category: 'mev', weight: 1 },
  { repo: 'drift-labs/keeper-bots-v2', category: 'mev', weight: 1 },

  // === Privacy ===
  { repo: 'elusiv-privacy/elusiv', category: 'privacy', weight: 1 },

  // === Compressed NFTs / State Compression ===
  { repo: 'metaplex-foundation/mpl-bubblegum', category: 'compression', weight: 2 },

  // === Mobile ===
  { repo: 'solana-mobile/mobile-wallet-adapter', category: 'mobile', weight: 2 },
  { repo: 'solana-mobile/dapp-publishing', category: 'mobile', weight: 1 },

  // === Restaking ===
  { repo: 'jito-foundation/restaking', category: 'restaking', weight: 3 },
  { repo: 'fragmetric-labs/fragmetric-contracts', category: 'restaking', weight: 1 },

  // === SVM / Rollups ===
  { repo: 'neonlabsorg/neon-evm', category: 'svm', weight: 2 },
  { repo: 'Eclipse-Laboratories-Inc/eclipse-deposit', category: 'svm', weight: 2 },
  { repo: 'soonlabs/igloo', category: 'svm', weight: 1 },

  // === Blinks & Actions ===
  { repo: 'dialectlabs/blinks', category: 'blinks', weight: 2 },

  // === ZK & Compression ===
  { repo: 'Lightprotocol/light-protocol', category: 'zk-compression', weight: 3 },
  { repo: 'helius-labs/photon', category: 'zk-compression', weight: 2 },

  // === AI Agents ===
  { repo: 'sendaifun/solana-agent-kit', category: 'ai-agents', weight: 2 },

  // === Education ===
  { repo: 'solana-developers/solana-cookbook', category: 'education', weight: 1 },
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

export function getCuratedRepoSet(): Set<string> {
  return new Set(CURATED_REPOS.map(r => r.repo.toLowerCase()));
}
