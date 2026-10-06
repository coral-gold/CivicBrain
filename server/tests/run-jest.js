// Cross-platform Jest launcher (ESM needs --experimental-vm-modules, set by the npm script).
import { run } from 'jest-cli';

run(['--runInBand', ...process.argv.slice(2)]);
