export class MockDb {
  constructor() {
    this.data = { 
      bookings: [], 
      customers: [], 
      enquiries: [], 
      admin: [{ id: 'admin1', username: 'admin', password: '$2b$10$Yogl59hLsMnROqVs6d.60OEmt/9qcwXO5Urwn5YP856QdJwKzeaRi' }], 
      counters: [{ id: '1', count: 1 }] 
    };
  }
  collection(name) {
    return new MockCollection(this.data[name] || (this.data[name] = []), name);
  }
  async runTransaction(callback) {
    const t = new MockTransaction(this);
    return await callback(t);
  }
}

class MockCollection {
  constructor(data, name) {
    this.data = data;
    this.name = name;
  }
  where(field, op, val) {
    let result = this.data.filter(item => {
      if (op === '==') return item[field] === val;
      if (op === '!=') return item[field] !== val;
      if (op === 'array-contains') return item[field] && item[field].includes(val);
      return false;
    });
    return new MockCollection(result, this.name);
  }
  limit(n) {
    return new MockCollection(this.data.slice(0, n), this.name);
  }
  async get() {
    return {
      empty: this.data.length === 0,
      size: this.data.length,
      docs: this.data.map(item => ({ id: item.id || item._id, data: () => item, ref: new MockDocRef(item.id, this.data) }))
    };
  }
  doc(id) {
    id = id || Math.random().toString(36).substring(7);
    return new MockDocRef(id, this.data);
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
    const item = this.collectionData.find(i => i.id === this.id);
    return { exists: !!item, id: this.id, data: () => item };
  }
  async set(data) {
    const idx = this.collectionData.findIndex(i => i.id === this.id);
    if (idx >= 0) this.collectionData[idx] = { id: this.id, ...data };
    else this.collectionData.push({ id: this.id, ...data });
  }
  async update(data) {
    const idx = this.collectionData.findIndex(i => i.id === this.id);
    if (idx >= 0) Object.assign(this.collectionData[idx], data);
  }
  async delete() {
    const idx = this.collectionData.findIndex(i => i.id === this.id);
    if (idx >= 0) this.collectionData.splice(idx, 1);
  }
}

class MockTransaction {
  constructor(db) { this.db = db; }
  get(ref) { return ref.get(); }
  set(ref, data) { ref.set(data); }
  update(ref, data) { ref.update(data); }
  delete(ref) { ref.delete(); }
}
