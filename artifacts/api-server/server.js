/**
 * server.js — Entry point for cPanel Node.js Selector
 *
 * Prerequisites:
 *   1. Build the server first from the project root:
 *        pnpm --filter @workspace/api-server run build
 *   2. In cPanel > Node.js Selector, set:
 *        Application startup file: server.js
 *        Application mode: Production
 *   3. Set the required environment variables in cPanel.
 *
 * See DEPLOY.md for full deployment instructions.
 */
import "./dist/index.mjs";
