import AinModule from '@ainblockchain/ain-js';

// Handle CJS/ESM interop: ain-js exports `module.exports.default = Ain`
// When imported via ESM, we get `{ default: AinConstructor }` instead of `AinConstructor`
const Ain = (AinModule as any).default || AinModule;
export default Ain;
export type AinInstance = InstanceType<typeof Ain>;
