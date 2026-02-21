/**
 * models/Registration.js
 * Mongoose schema for student Rag Day registrations
 */

const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema(
    {
        // Student Info
        name: {
            type: String,
            required: [true, 'Student name is required'],
            trim: true,
        },
        roll: {
            type: String,
            required: [true, 'Roll number is required'],
            trim: true,
        },
        section: {
            type: String,
            required: [true, 'Section is required'],
            trim: true,
        },
        department: {
            type: String,
            required: [true, 'Department is required'],
            trim: true,
        },
        email: {
            type: String,
            required: [true, 'Email address is required'],
            unique: true,           // One registration per email
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
        },
        phone: {
            type: String,
            trim: true,
            default: '',
        },

        // Payment Info
        payment_method: {
            type: String,
            required: [true, 'Payment method is required'],
            enum: ['Bkash', 'Nagad'],
        },
        tshirt_size: {
            type: String,
            required: [true, 'T-shirt size is required'],
            enum: ['M', 'L', 'XL', 'XXL'],
        },
        transaction_id: {
            type: String,
            required: [true, 'Transaction ID is required'],
            unique: true,           // Prevent duplicate transactions
            trim: true,
        },
        payment_time: {
            type: String,
            required: [true, 'Payment time is required'],
        },
        screenshot: {
            type: String,           // Filename stored in /uploads
            default: '',
        },

        // Admin Fields
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending',
        },
    },
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    }
);

module.exports = mongoose.model('Registration', registrationSchema);
