const { MongoClient } = require('mongodb');
require('dotenv').config();

class MongoDB {
    constructor() {
        this.client = null;
        this.uri = process.env.MONGODB_URI;
        this.db = null;
    }

    async connect() {
        try {
            this.client = new MongoClient(this.uri);
            await this.client.connect();
            this.db = this.client.db('discord');
            console.log("Connected to MongoDB");
            return this.client;
        } catch (error) {
            console.error("MongoDB 연결 오류:", error);
            throw error;
        }
    }

    // 컬렉션 접근 메서드 추가
    getCollection(name) {
        return this.db.collection(name);
    }

    // 멤버 데이터 조회
    async getMember(name) {
        const collection = this.getCollection('member');
        return await collection.findOne({ name });
    }

    // 멤버 데이터 추가
    async addMember(memberData) {
        const collection = this.getCollection('member');
        return await collection.insertOne(memberData);
    }

    // 기존 메서드들...
    async close() {
        if (this.client) {
            await this.client.close();
            console.log("Disconnected from MongoDB");
        }
    }

    async checkConnection() {
        console.log("Checking DB Connection...");
        try {
            await this.client.db().command({ ping: 1 });
            console.log("MongoDB connection established!");
            return true;
        } catch (error) {
            console.error("Unable to connect to MongoDB:", error);
            return false;
        }
    }
}

module.exports = new MongoDB(); 