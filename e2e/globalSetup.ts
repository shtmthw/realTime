import { e2eDatabaseUrl, resetDatabase } from './server';

export default function setup() {
  resetDatabase(e2eDatabaseUrl);
}
