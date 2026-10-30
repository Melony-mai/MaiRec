#!/usr/bin/env node
import { registerNativeMessagingHost } from './sync.mjs';

const res = registerNativeMessagingHost();
if (res.success) {
  console.log('[MaiRec Native Host] Registered successfully at:');
  for (const p of res.registeredPaths) {
    console.log('  •', p);
  }
} else {
  console.error('[MaiRec Native Host] Registration failed.');
  process.exit(1);
}
