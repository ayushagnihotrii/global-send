/**
 * Global Send: Telegram MTProto Quick Setup & Session Generator
 * 
 * Usage:
 *   node scripts/telegram-setup.mjs
 * 
 * Interactively logs into Telegram using MTProto and outputs your
 * TELEGRAM_SESSION_STRING so you can paste it directly into your .env.local file.
 */

import readline from 'readline';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
  console.log('\n======================================================');
  console.log('   Global Send: Telegram MTProto Storage Setup');
  console.log('======================================================\n');
  console.log('Get your API credentials from: https://my.telegram.org (under API Development Tools)\n');

  const apiIdStr = await question('Enter Telegram API ID: ');
  const apiId = parseInt(apiIdStr.trim(), 10);
  const apiHash = (await question('Enter Telegram API Hash: ')).trim();

  if (!apiId || !apiHash) {
    console.error('Error: API ID and API Hash are required.');
    rl.close();
    process.exit(1);
  }

  const mode = (await question('\nAuthenticate as: [1] Telegram Bot Token  [2] Personal User Account (Default: 1): ')).trim();

  const stringSession = new StringSession('');
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  if (mode === '2') {
    await client.start({
      phoneNumber: async () => await question('Enter phone number (+1234567890): '),
      password: async () => await question('Enter 2FA password (if enabled): '),
      phoneCode: async () => await question('Enter the login code you received in Telegram: '),
      onError: (err) => console.error('Telegram Auth Error:', err),
    });
    console.log('\n✓ Successfully authenticated as User account!');
  } else {
    const botToken = (await question('Enter Telegram Bot Token (from @BotFather): ')).trim();
    await client.start({
      botAuthToken: botToken,
    });
    console.log('\n✓ Successfully authenticated as Bot account via MTProto!');
  }

  const sessionString = client.session.save();
  const channelId = (await question('\nEnter your Storage Channel ID (e.g. -100xxxxxxxxxx): ')).trim();

  console.log('\n======================================================');
  console.log('   Add these lines to your .env.local:');
  console.log('======================================================\n');
  console.log('STORAGE_PROVIDER=telegram');
  console.log(`TELEGRAM_API_ID=${apiId}`);
  console.log(`TELEGRAM_API_HASH=${apiHash}`);
  console.log(`TELEGRAM_STORAGE_CHANNEL_ID=${channelId}`);
  if (sessionString) {
    console.log(`TELEGRAM_SESSION_STRING=${sessionString}`);
  }
  console.log('\n======================================================\n');

  await client.disconnect();
  rl.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('\nSetup error:', err);
  rl.close();
  process.exit(1);
});
