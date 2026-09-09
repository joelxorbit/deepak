import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const DB_FILE = path.resolve(DATA_DIR, 'local_db.json');

const INITIAL_RATES = [
  {
    id: 'rate_standard',
    _id: 'rate_standard',
    ruleName: 'Standard Turf Pricing',
    sportId: 'all',
    ratePerHour: 600,
    peakRatePerHour: 800,
    weekendRatePerHour: 800,
    daysOfWeek: ['ALL'],
    timeSlots: ['ALL'],
    isPeak: false,
    status: 'active',
    priority: 20,
    notes: 'Normal Hours: ₹600 (10 AM - 4 PM) | Peak Hours: ₹800 (All other times)',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export class MockDb {
  constructor() {
    this.data = this._loadData();
  }

  _loadData() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        if (!parsed.admins) parsed.admins = [{ id: 'admin1', username: 'admin', password: '.60OEmt/9qcwXO5Urwn5YP856QdJwKzeaRi', role: 'admin' }];
        if (!parsed.rates || parsed.rates.length === 0) parsed.rates = INITIAL_RATES;
        if (!parsed.settings) parsed.settings = [{ id: 'paymentSettings', fixedAdvanceAmount: 200 }];
        if (!parsed.bookings) parsed.bookings = [];
        if (!parsed.customers) parsed.customers = [];
        if (!parsed.enquiries) parsed.enquiries = [];
        if (!parsed.events) parsed.events = [];
        if (!parsed.counters) parsed.counters = [{ id: '1', count: 1 }];
        if (!parsed.slot_holds) parsed.slot_holds = [];
        if (!parsed.blocked_slots) parsed.blocked_slots = [];
        if (!parsed.audit_logs) parsed.audit_logs = [];
        if (!parsed.idempotency_keys) parsed.idempotency_keys = [];
        return parsed;
      }
    } catch (e) {
      console.warn('[MockDb] Warning reading local_db.json, reinitializing:', e.message);
    }

    const defaultData = {
      bookings: [],
      customers: [],
      enquiries: [],
      events: [],
      admins: [{ id: 'admin1', username: 'admin', password: '.60OEmt/9qcwXO5Urwn5YP856QdJwKzeaRi', role: 'admin' }],
      counters: [{ id: '1', count: 1 }],
      slot_holds: [],
      blocked_slots: [],
      settings: [{ id: 'paymentSettings', fixedAdvanceAmount: 200 }],
      rates: INITIAL_RATES,
      audit_logs: [],
      idempotency_keys: []
    };
    this._saveData(defaultData);
    return defaultData;
  }

  _saveData(data = this.data) {
    if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined) {
      return; // Do not overwrite development database during automated tests
    }
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      console.error('[MockDb] Error saving local_db.json:', e.message);
    }
  }

  save() {
    this._saveData();
  }

  settings(opts) {
    return this;
  }

  collection(name) {
    if (!this.data[name]) {
      this.data[name] = [];
    }
    return new MockCollection(this.data[name], name, this);
  }

  batch() {
    return new MockBatch(this);
  }

  async runTransaction(callback) {
    const t = new MockTransaction(this);
    const result = await callback(t);
    this.save();
    return result;
  }
}

class MockBatch {
  constructor(db) {
    this.db = db;
    this.ops = [];
  }
  set(ref, data, options) {
    this.ops.push(() => ref.set(data, options));
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
    this.db.save();
  }
}

class MockCollection {
  constructor(data, name, db, filters = [], sorters = [], limitCount = null, offsetCount = 0) {
    this.data = data;
    this.name = name;
    this.db = db;
    this.filters = filters;
    this.sorters = sorters;
    this.limitCount = limitCount;
    this.offsetCount = offsetCount;
  }

  where(field, op, val) {
    const newFilters = [...this.filters, { field, op, val }];
    return new MockCollection(this.data, this.name, this.db, newFilters, this.sorters, this.limitCount, this.offsetCount);
  }

  orderBy(field, direction = 'asc') {
    const newSorters = [...this.sorters, { field, direction }];
    return new MockCollection(this.data, this.name, this.db, this.filters, newSorters, this.limitCount, this.offsetCount);
  }

  limit(n) {
    return new MockCollection(this.data, this.name, this.db, this.filters, this.sorters, n, this.offsetCount);
  }

  startAfter(cursorDoc) {
    const cursorId = cursorDoc?.id || cursorDoc;
    let offset = 0;
    if (cursorId) {
      const idx = this.data.findIndex(item => (item.id === cursorId || item._id === cursorId));
      if (idx >= 0) offset = idx + 1;
    }
    return new MockCollection(this.data, this.name, this.db, this.filters, this.sorters, this.limitCount, offset);
  }

  _applyFilters() {
    let result = [...this.data];
    for (const { field, op, val } of this.filters) {
      result = result.filter(item => {
        const itemVal = item[field];
        if (op === '==') return itemVal === val;
        if (op === '!=') return itemVal !== val;
        if (op === 'in') return Array.isArray(val) && val.includes(itemVal);
        if (op === 'array-contains') return Array.isArray(itemVal) && itemVal.includes(val);
        if (op === '>') return itemVal > val;
        if (op === '>=') return itemVal >= val;
        if (op === '<') return itemVal < val;
        if (op === '<=') return itemVal <= val;
        return true;
      });
    }
    for (const { field, direction } of this.sorters) {
      result.sort((a, b) => {
        const aVal = a[field];
        const bVal = b[field];
        if (aVal === bVal) return 0;
        if (direction === 'desc') return aVal < bVal ? 1 : -1;
        return aVal > bVal ? 1 : -1;
      });
    }
    if (this.offsetCount > 0) {
      result = result.slice(this.offsetCount);
    }
    if (this.limitCount !== null) {
      result = result.slice(0, this.limitCount);
    }
    return result;
  }

  async get() {
    const items = this._applyFilters();
    return {
      empty: items.length === 0,
      size: items.length,
      docs: items.map(item => {
        const docId = item.id || item._id || item.holdId || item.bookingId;
        return {
          id: docId,
          data: () => ({ ...item }),
          ref: new MockDocRef(docId, this.data, this.db)
        };
      })
    };
  }

  doc(id) {
    id = id || 'doc_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
    return new MockDocRef(id, this.data, this.db);
  }

  async add(data) {
    const ref = this.doc();
    await ref.set(data);
    return ref;
  }
}

class MockDocRef {
  constructor(id, collectionData, db) {
    this.id = id;
    this.collectionData = collectionData;
    this.db = db;
  }

  async get() {
    const item = this.collectionData.find(i => (i.id === this.id || i._id === this.id || i.holdId === this.id || i.bookingId === this.id));
    return {
      exists: !!item,
      id: this.id,
      data: () => item ? ({ ...item }) : undefined
    };
  }

  async set(data, options = {}) {
    const idx = this.collectionData.findIndex(i => (i.id === this.id || i._id === this.id || i.holdId === this.id || i.bookingId === this.id));
    if (idx >= 0) {
      if (options.merge) {
        this.collectionData[idx] = { ...this.collectionData[idx], ...data, id: this.id, _id: this.id };
      } else {
        this.collectionData[idx] = { id: this.id, _id: this.id, ...data };
      }
    } else {
      this.collectionData.push({ id: this.id, _id: this.id, ...data });
    }
    this.db?.save();
  }

  async update(data) {
    const idx = this.collectionData.findIndex(i => (i.id === this.id || i._id === this.id || i.holdId === this.id || i.bookingId === this.id));
    if (idx >= 0) {
      Object.assign(this.collectionData[idx], data);
      this.db?.save();
    }
  }

  async delete() {
    const idx = this.collectionData.findIndex(i => (i.id === this.id || i._id === this.id || i.holdId === this.id || i.bookingId === this.id));
    if (idx >= 0) {
      this.collectionData.splice(idx, 1);
      this.db?.save();
    }
  }
}

class MockTransaction {
  constructor(db) { this.db = db; }
  async get(ref) { return await ref.get(); }
  set(ref, data, options) { return ref.set(data, options); }
  update(ref, data) { return ref.update(data); }
  delete(ref) { return ref.delete(); }
}
