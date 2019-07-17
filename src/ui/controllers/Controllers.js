class Controllers {
  constructor() {
    this.masterDb = new IndexedDbMaster();
    this.masterDb.initialize()
  }

}
