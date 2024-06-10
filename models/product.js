var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var ProductSchema = new Schema({
	category: { type: Schema.Types.ObjectId, ref: 'Category' },
	name: String,
	price: Number,
	color: String,
	productMaterial: String,
	image: String,
	description: String
});

ProductSchema.index({name: 'text', category: 'text'})
module.exports = mongoose.model('Product', ProductSchema);
