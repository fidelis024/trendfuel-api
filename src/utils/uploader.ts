// utils/uploader.ts
import multer from 'multer';
import cloudinary from '../config/cloudinary';

export const upload = multer({ storage: multer.memoryStorage() });

export const uploadToCloudinary = async (file: any) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'trendfuel' },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(file.buffer);
  });
};

export default upload;
