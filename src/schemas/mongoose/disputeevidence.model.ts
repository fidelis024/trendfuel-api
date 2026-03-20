import mongoose, { Document, Schema } from 'mongoose';

export enum EvidenceUploader {
  BUYER = 'buyer',
  SELLER = 'seller',
}

export interface IDisputeEvidence extends Document {
  disputeId: mongoose.Types.ObjectId;
  uploadedBy: mongoose.Types.ObjectId;
  uploaderRole: EvidenceUploader;
  fileUrl: string;        // Cloudinary URL
  fileType: string;       // MIME type
  fileName: string;
  createdAt: Date;
}

const DisputeEvidenceSchema = new Schema<IDisputeEvidence>(
  {
    disputeId: { type: Schema.Types.ObjectId, ref: 'Dispute', required: true, index: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    uploaderRole: { type: String, enum: Object.values(EvidenceUploader), required: true },
    fileUrl: { type: String, required: true },
    fileType: { type: String, required: true },
    fileName: { type: String, required: true },
  },
  { timestamps: true }
);

export const DisputeEvidence = mongoose.model<IDisputeEvidence>(
  'DisputeEvidence',
  DisputeEvidenceSchema
);