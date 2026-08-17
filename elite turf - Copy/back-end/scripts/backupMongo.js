import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { ENV } from '../config/env.js';

const backupMongoData = async () => {
  console.log('[Backup Script] Connecting to MongoDB...');
  try {
    const conn = await mongoose.connect(ENV.MONGODB_URI);
    console.log(`[Backup Script] Connected to MongoDB host: ${conn.connection.host}`);

    const db = conn.connection.db;
    const collections = await db.listCollections().toArray();

    const backupDir = path.resolve(process.cwd(), './backup');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilePath = path.join(backupDir, `mongo_backup_${timestamp}.json`);

    const backupData = {};

    for (const col of collections) {
      const colName = col.name;
      const docs = await db.collection(colName).find({}).toArray();
      backupData[colName] = docs;
      console.log(`[Backup Script] Exported ${docs.length} documents from collection: ${colName}`);
    }

    fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2));
    console.log(`[Backup Script] SUCCESS! Full MongoDB backup saved to ${backupFilePath}`);

    await mongoose.disconnect();
  } catch (error) {
    console.error(`[Backup Script Failure] ${error.message}`);
    process.exit(1);
  }
};

backupMongoData();
