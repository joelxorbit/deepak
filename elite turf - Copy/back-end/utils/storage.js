import { getStorageBucket } from '../config/firebase.js';
import { logger } from './logger.js';

export const uploadFileToStorage = async (filePath, destinationFileName, mimeType = 'image/jpeg') => {
  const bucket = getStorageBucket();
  if (!bucket) {
    throw new Error('Firebase Storage bucket not configured.');
  }

  const [file] = await bucket.upload(filePath, {
    destination: destinationFileName,
    metadata: {
      contentType: mimeType
    },
    public: true
  });

  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;
  logger.info(`[Storage] File uploaded successfully to ${publicUrl}`);
  return publicUrl;
};

export const deleteFileFromStorage = async (fileUrl) => {
  if (!fileUrl || typeof fileUrl !== 'string') return;
  
  const bucket = getStorageBucket();
  if (!bucket) return;

  try {
    const bucketName = bucket.name;
    const prefix = `https://storage.googleapis.com/${bucketName}/`;
    if (fileUrl.startsWith(prefix)) {
      const fileName = fileUrl.replace(prefix, '');
      await bucket.file(fileName).delete();
      logger.info(`[Storage] Deleted file ${fileName} from Firebase Storage.`);
    }
  } catch (error) {
    logger.warn(`[Storage Warning] Failed to delete file ${fileUrl}: ${error.message}`);
  }
};
