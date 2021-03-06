const mongoose = require('mongoose')

const dogSchema = new mongoose.Schema({
  image: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  label: {
    type: Array
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
})

module.exports = mongoose.model('Dog', dogSchema)
