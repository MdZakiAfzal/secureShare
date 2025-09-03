const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
    originalName: {
        type: String,
        required: true
    },
    filename: {
        type: String,
        required: true
    },
    path: {
        type: String,
        required: true
    },
    size: {
        type: Number,
        required: true
    },
    mimetype: {
        type: String,
        required: true
    },
    fileHash: {
        type: String,
        required: true,
        unique: true
    },
    blockchainTxHash: {
        type: String,
        required: true
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    shareToken: {
        type: String,
        required: true,
        unique: true
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expireAfterSeconds: 0 } // MongoDB TTL index for auto-cleanup
    },
    downloadCount: {
        type: Number,
        default: 0
    },
    isPublic: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    allowedCities: [{
        type: String,
        trim: true
    }],
    accessLocation: {
        type: {
            type: String,
            enum: ['anywhere', 'specific-cities'],
            default: 'anywhere'
        },
        cities: [String]
    }
});

// Index for efficient queries
fileSchema.index({ shareToken: 1 });
fileSchema.index({ uploadedBy: 1 });
fileSchema.index({ expiresAt: 1 });

module.exports = mongoose.model('File', fileSchema);