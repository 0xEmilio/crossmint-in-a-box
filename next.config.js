/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.fallback = {
      fs: false,
      net: false,
      tls: false,
      'pino-pretty': false,
      // Optional React Native dep pulled in transitively by @dynamic-labs/ethereum (via
      // @metamask/sdk, used for wallet-connect support in the upgraded Crossmint SDK) — not
      // needed on web, and not installed.
      '@react-native-async-storage/async-storage': false,
    };
    return config;
  },
};

module.exports = nextConfig; 