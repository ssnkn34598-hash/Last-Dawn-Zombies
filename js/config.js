// Build-time settings. build.js rewrites this file for each platform build;
// in the repository it stays on "auto" so the game runs anywhere for testing.

const GAME_CONFIG = {
  // 'auto' (detect), 'yandex', 'vk' or 'local'
  platform: 'auto',
  // VK mini app and community ids (for share links and "join the community").
  vkAppId: 0,
  vkGroupId: 0,
};

// Rewards for VK social actions (invite, share, join...). Off by default:
// enable only if the platform rules allow rewarding these actions.
const SOCIAL_REWARDS = false;
