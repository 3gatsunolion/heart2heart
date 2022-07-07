import mongoose, { Schema } from 'mongoose';

export const maxPrefixLength = 5

const schema = new Schema({
    id: {
        type: String,
        required: true,
    },
    prefix: {
        type: String,
        minLength: 1,
        maxLength: maxPrefixLength,
        default: process.env.PREFIX,
    },
})

export default mongoose.model('Guild', schema)
