export class MockDb {
  constructor() {
    this.data = { 
      bookings: [], 
      customers: [], 
      enquiries: [], 
      admin: [{ id: 'admin1', username: 'admin', password: '$2b$10$Yogl59hLsMnROqVs6d.60OEmt/9qcwXO5Urwn5YP856QdJwKzeaRi' }], 
      counters: [{ id: '1', count: 1 }],
      slot_holds: [],
      blocked_slots: [],
      settings: [{ id: 'paymentSettings', fixedAdvanceAmount: 200 }],
      rates: [
        { id: 'rate_football_std', sportId: 'football-5v5', daysOfWeek: ['ALL'], timeSlots: ['ALL'], ratePerHour: 300, isPeak: false },
        { id: 'rate_cricket_std', sportId: 'cricket', daysOfWeek: ['ALL'], timeSlots: ['ALL'], ratePerHour: 150, isPeak: false }
      ]
    };
  }
  collection(name) {
    if (!this.data[name]) {
      this.data[name] = [];
    }
    return new MockCollection(this.data[name], name, this.data[name]);
  }
  batch() {
    return new MockBatch(this);
  }
  async runTransaction(callback) {
    const t = new MockTransaction(this);
    return await callback(t);
  }
}

class MockBatch {
  constructor(db) {
    this.db = db;
    this.ops = [];
  }
  set(ref, data) {
    this.ops.push(() => ref.set(data));
    return this;
  }
  update(ref, data) {
    this.ops.push(() => ref.update(data));
    return this;
  }
  delete(ref) {
    this.ops.push(() => ref.delete());
    return this;
  }
  async commit() {
    for (const op of this.ops) {
      await op();
    }
  }
}

class MockCollection {
  constructor(data, name, rootData) {
    this.data = data;
    this.name = name;
    this.rootData = rootData || data;
  }
  where(field, op, val) {
    let result = this.data.filter(item => {
      if (op === '==') return item[field] === val;
      if (op === '!=') return item[field] !== val;
      if (op === 'array-contains') return item[field] && item[field].includes(val);
      return false;
    });
    return new MockCollection(result, this.name, this.rootData);
  }
  limit(n) {
    return new MockCollection(this.data.slice(0, n), this.name, this.rootData);
  }
  async get() {
    return {
      empty: this.data.length === 0,
      size: this.data.length,
      docs: this.data.map(item => {
        const docId = item.id || item._id || item.holdId || item.bookingId;
        return {
          id: docId,
          data: () => item,
          ref: new MockDocRef(docId, this.rootData)
        };
      })
    };
  }
  doc(id) {
    id = id || Math.random().toString(36).substring(2, 9);
    return new MockDocRef(id, this.rootData);
  }
  async add(data) {
    const ref = this.doc();
    await ref.set(data);
    return ref;
  }
}

class MockDocRef {
  constructor(id, collectionData) {
    this.id = id;
    this.collectionData = collectionData;
  }
  async get() {
    const item = this.collectionData.find(i => (i.id === this.id || i._id === this.id || i.holdId === this.id || i.bookingId === this.id));
    return { exists: !!item, id: this.id, data: () => item };
  }
  async set(data) {
    const idx = this.collectionData.findIndex(i => (i.id === this.id || i._id === this.id || i.holdId === this.id || i.bookingId === this.id));
    if (idx >= 0) this.collectionData[idx] = { id: this.id, ...data };
    else this.collectionData.push({ id: this.id, ...data });
  }
  async update(data) {
    const idx = this.collectionData.findIndex(i => (i.id === this.id || i._id === this.id || i.holdId === this.id || i.bookingId === this.id));
    if (idx >= 0) Object.assign(this.collectionData[idx], data);
  }
  async delete() {
    const idx = this.collectionData.findIndex(i => (i.id === this.id || i._id === this.id || i.holdId === this.id || i.bookingId === this.id));
    if (idx >= 0) this.collectionData.splice(idx, 1);
  }
}

class MockTransaction {
  constructor(db) { this.db = db; }
  get(ref) { return ref.get(); }
  set(ref, data) { return ref.set(data); }
  update(ref, data) { return ref.update(data); }
  delete(ref) { return ref.delete(); }
}
