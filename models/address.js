var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var AddressSchema = new Schema({
	owner: { type: Schema.Types.ObjectId, ref: 'User' },
	fname: String,
	mobile: Number,
	pincode: Number,
	flatno: String,
	area_colony: String,
	landmark: String,
	town: String
});

module.exports = mongoose.model('Address', AddressSchema);
