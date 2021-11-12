const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express()
const port = process.env.PORT || 5000
const { MongoClient } = require('mongodb');
const admin = require("firebase-admin");

app.use(cors());
app.use(express.json());

// exploring-watches-firebase-adminsdk.json 

const serviceAccount = require('./exploring-watches-firebase-adminsdk.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xmzth.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });



async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const token = req.headers.authorization.split(' ')[1];
        try {
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;
        }
        catch {

        }
    }
    next();
}



async function run() {
    try {
        await client.connect();
        const database = client.db('exploring-watches');
        const watchCollection = database.collection('watches');
        const usersCollection = database.collection('users');
        const orderCollection = database.collection('orders');


        app.get('/watches', async (req, res) => {
            const cursor = watchCollection.find({});
            const watches = await cursor.toArray();
            res.json(watches);
        });


        app.get('/watches/home', async (req, res) => {
            const cursor = watchCollection.find().limit(6);
            const watches = await cursor.toArray();
            res.json(watches);
        });
        // app.get('/products', verifyToken, async (req, res) => {           
        //     const cursor = watchCollection.find();
        //     const appointments = await cursor.toArray();
        //     res.json(appointments);
        // });

        app.post('/products', async (req, res) => {
            const appointment = req.body;
            const result = await watchCollection.insertOne(appointment);
            res.json(result)
        });

        app.post('/orders', async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.json(result);
        });

        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            let isAdmin = false;
            if (user.role === 'admin') {
                isAdmin = true;
            }
            res.json({ admin: isAdmin });
        })


        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            console.log(result);
            res.json(result)
        });


        app.put('/users', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const options = { upsert: true };
            const updateDoc = { $set: user };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        });


        app.put('/users/admin', verifyToken, async (req, res) => {
            const user = req.body;
            const requester = req.decodedEmail;
            if (requester) {
                const requesterAccount = await usersCollection.findOne({ email: requester });
                if (requesterAccount.role === "admin") {
                    const filter = { email: user.email };
                    const updateDoc = { $set: { role: "admin" } };
                    const result = await usersCollection.updateOne(filter, updateDoc);
                    res.json(result)
                }
            }
            else {
                res.status(403).json({ message: "you do not have to access to make admin" });
            }
        })
    }
    finally {
        // await client.close();
    }
}

run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Exploring-watches-server is running');
})

app.listen(port, () => {
    console.log(`listening at :${port}`)
})