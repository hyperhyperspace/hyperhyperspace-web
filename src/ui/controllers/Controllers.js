import { IndexedDbMaster, IndexedDbAccount } from './db/storage.js';


class Controllers {
  constructor() {
    this.masterDb = new IndexedDbMaster();
    this.masterDb.initialize()
  }

}
