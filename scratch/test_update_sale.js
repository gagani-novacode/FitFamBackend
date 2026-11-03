import { setServers } from 'dns';
setServers(['8.8.8.8', '8.8.4.4']);
import "dotenv/config";
import { connectDB } from "../config/db.js";
import Sale from "../src/models/Sale.model.js";

await connectDB(process.env.MONGO_URI);

const sale = await Sale.findById('6ae85a10a7ac4ddae818ddca');
sale.products = { "6ae4549cbed86407c9ec45b8": 1000 };
await sale.save();

console.log('sale.products:', sale.products);
console.log('type of products:', typeof sale.products);
console.log('instanceof Map:', sale.products instanceof Map);
const productMap = sale.products instanceof Map ? Object.fromEntries(sale.products) : (sale.products || {});
console.log('productMap:', productMap);
console.log('productIds:', Object.keys(productMap));

process.exit(0);
