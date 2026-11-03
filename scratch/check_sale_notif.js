import { setServers } from 'dns';
setServers(['8.8.8.8', '8.8.4.4']);
import "dotenv/config";
import { connectDB } from "../config/db.js";
import Sale from "../src/models/Sale.model.js";
import Product from "../src/models/Product.model.js";

await connectDB(process.env.MONGO_URI);

const sale = await Sale.findById('6ae85a10a7ac4ddae818ddca');
console.log('sale:', sale);
console.log('sale.products:', sale.products);
console.log('instanceof Map:', sale.products instanceof Map);

const productMap = sale.products instanceof Map ? Object.fromEntries(sale.products) : (sale.products || {});
console.log('productMap:', productMap);

const productIds = Object.keys(productMap);
console.log('productIds:', productIds);

const productsFromDb = await Product.find({ _id: { $in: productIds } }).lean();
console.log('productsFromDb count:', productsFromDb.length);
if (productsFromDb.length) {
  console.log('product found:', productsFromDb[0].name);
}

process.exit(0);
