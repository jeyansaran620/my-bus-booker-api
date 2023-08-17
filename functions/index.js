const functions  = require("firebase-functions");
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const admin = require("firebase-admin");
const credentials = require("./key.json");
const BUS_COLLECTION = "buses";

admin.initializeApp({
  credential: admin.credential.cert(credentials),
});

const db = admin.firestore();


app.post("/bus", bodyParser.json(), async (req, res) => {
    try {
      const id = req.body.id;
      const busJson = {
        id: req.body.id,
        name: req.body.name,
        seats: req.body.seats,
      };
  
      const response = db.collection(BUS_COLLECTION).doc(id.toString()).set(busJson);
      res.send(response);
    } catch (error) {
      console.log(error);
      res.send(error);
    }
  });


app.post('/book', bodyParser.json(), async(req, res) => {
    try {
        
    const {id, userId, seatNo } = req.body;

    const busRef = db.collection(BUS_COLLECTION).doc(id.toString());
    const bus = (await busRef.get()).data();

    if( !(seatNo in bus.seats) || bus.seats[seatNo].booked)
    {
     return res.status(400).json()
    }

    const response =  busRef.update({
        [`seats.${seatNo}`] : {
            booked: true,
            bookedBy: userId
        }
    });
    res.send(response);
    } catch(error) {
        console.log(error)
    res.send(error);
    }});

  

app.get("/availableBuses", async (req, res) => {
  try {
    const busRef = db.collection(BUS_COLLECTION);
    const response = await busRef.get();
    let responseArr = [];
  
    response.forEach((doc) => {
        const bus = doc.data();
        if(Object.values(bus.seats).some(seat => seat.booked !== true))
        {   
            responseArr.push(bus);
        }
    });

    res.send(responseArr);
  } catch (error) {
    console.log(error)
    res.send(error);
  }
});

app.get("/bus/:id", async (req, res) => {
  try {
    const busRef = db.collection(BUS_COLLECTION).doc(req.params.id);
    const response = await busRef.get();
    res.send(response.data());
  } catch (error) {
    res.send(error);
  }
});

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

exports.app = functions.https.onRequest(app);