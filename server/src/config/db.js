import mongoose from 'mongoose';
import { env } from './env.js';
import dns from 'dns';


dns.setServers([         // for error of nodejs
    '1.1.1.1',
    '8.8.8.8'
])


export async function connectDB() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  console.log(`✅ MongoDB connected (${mongoose.connection.host})`);
}
