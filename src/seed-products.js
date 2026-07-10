import "dotenv/config.js";
import { setServers } from 'dns';
setServers(['8.8.8.8', '8.8.4.4']);
import mongoose from "mongoose";
import Product from "./models/Product.model.js";

const products = [
  {
    name: 'Revolution Oversize Tee – NO DAYS OFF',
    category: 'Men',
    price: 3500,
    images: ['https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=600&auto=format&fit=crop&q=80'],
    isNewProduct: true,
    badge: 'NEW',
    tags: ['New Arrivals', 'Top Rated'],
    sizes: ['S', 'M', 'L'],
    stock: { S: 10, M: 20, L: 15 }
  },
  {
    name: 'Revolution Oversize Tee – HEAVY',
    category: 'Men',
    price: 3500,
    images: ['https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600&auto=format&fit=crop&q=80'],
    isNewProduct: true,
    badge: 'NEW',
    tags: ['New Arrivals'],
    sizes: ['S', 'M', 'L'],
    stock: { S: 5, M: 10, L: 5 }
  },
  {
    name: 'Revolution Oversize Tee – DRIP FITFAM',
    category: 'Men',
    price: 3500,
    images: ['https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80'],
    isNewProduct: true,
    badge: 'NEW',
    tags: ['New Arrivals', 'Features'],
    sizes: ['S', 'M', 'L', 'XL'],
    stock: { S: 10, M: 15, L: 10, XL: 5 }
  },
  {
    name: '2.5L Gym Water Bottle',
    category: 'Accessories',
    price: 3950,
    originalPrice: 4500,
    images: ['https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&auto=format&fit=crop&q=80'],
    isSale: true,
    badge: 'HOT',
    tags: ['Features', 'Top Rated'],
    sizes: ['One Size'],
    stock: { 'One Size': 50 }
  },
  {
    name: 'Curve Tech Stringer Tank Top',
    category: 'Men',
    price: 1650,
    originalPrice: 2200,
    images: ['https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80'],
    isSale: true,
    badge: 'HOT',
    tags: ['Features', 'New Arrivals'],
    sizes: ['M', 'L', 'XL'],
    stock: { M: 12, L: 8, XL: 4 }
  },
  {
    name: 'Curve Tech Stringer Tank Top Cotton – Black',
    category: 'Men',
    price: 1650,
    originalPrice: 2000,
    images: ['https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600&auto=format&fit=crop&q=80'],
    isSale: true,
    badge: 'HOT',
    tags: ['Top Rated'],
    sizes: ['S', 'M', 'L'],
    stock: { S: 5, M: 5, L: 5 }
  },
  {
    name: 'Curve Tech Stringer Tank Top DRY – FIT',
    category: 'Men',
    price: 1650,
    originalPrice: 2400,
    images: ['https://images.unsplash.com/photo-1605296867304-46d5465a25f1?w=600&auto=format&fit=crop&q=80'],
    isSale: true,
    badge: 'HOT',
    tags: ['New Arrivals', 'Features'],
    sizes: ['S', 'M', 'L'],
    stock: { S: 8, M: 15, L: 10 }
  },
  {
    name: 'Curve Soft Stringer Tank Top – Coral',
    category: 'Women',
    price: 3400,
    originalPrice: 3800,
    images: ['https://images.unsplash.com/photo-1518310383802-640c2de311b2?w=600&auto=format&fit=crop&q=80'],
    isSale: true,
    badge: 'SALE',
    tags: ['Top Rated'],
    sizes: ['XS', 'S', 'M'],
    stock: { XS: 3, S: 10, M: 8 }
  },
  {
    name: 'Core Compression High-Waist Leggings',
    category: 'Women',
    price: 4200,
    originalPrice: 4800,
    images: ['https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&auto=format&fit=crop&q=80'],
    isSale: true,
    badge: 'HOT',
    tags: ['New Arrivals', 'Features'],
    sizes: ['S', 'M', 'L'],
    stock: { S: 10, M: 10, L: 10 }
  },
  {
    name: 'Oversized Tee',
    category: 'Women',
    price: 2900,
    images: ['https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&auto=format&fit=crop&q=80'],
    isNewProduct: true,
    badge: 'NEW',
    tags: ['New Arrivals'],
    sizes: ['S', 'M', 'L'],
    stock: { S: 5, M: 5, L: 5 }
  },
  {
    name: 'FITFAM Grip Lifting Straps (Pair)',
    category: 'Accessories',
    price: 1800,
    originalPrice: 2400,
    images: ['https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80'],
    isSale: true,
    badge: 'SALE',
    tags: ['Features'],
    sizes: ['One Size'],
    stock: { 'One Size': 100 }
  }
];

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, { dbName: "sarakuglobal" });
    console.log("Connected to MongoDB for Seeding...");
    
    await Product.deleteMany({});
    console.log("Cleared old products...");
    
    await Product.insertMany(products);
    console.log(`Inserted ${products.length} products successfully!`);
    
    process.exit(0);
  } catch (error) {
    console.error("Error seeding data:", error);
    process.exit(1);
  }
};

seedDB();
