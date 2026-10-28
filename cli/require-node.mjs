// Stops `npm test` and `npm run golden:update` under Node < 24 (.node-version). The golden hashes
// differ under Node 22 (devlog, M25), so tests would fail obscurely and an update would write wrong
// goldens. Plain JavaScript, so it runs on Node versions that cannot run `.ts` (M26).
const major = Number(process.versions.node.split(".")[0]);
if (major < 24) {
  console.error(`Node 24 or newer is needed (.node-version); this is ${process.version}.`);
  process.exit(1);
}
