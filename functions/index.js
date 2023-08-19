const functions = require("firebase-functions");
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const cors = require("cors");
const admin = require("firebase-admin");
const credentials = require("./key.json");
const BUS_COLLECTION = "buses";

admin.initializeApp({
  credential: admin.credential.cert(credentials),
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

const db = admin.firestore();

app.post("/bus", bodyParser.json(), async (req, res) => {
  try {
    const id = req.body.id;
    const busJson = {
      id: req.body.id,
      name: req.body.name,
      seats: req.body.seats,
      price: req.body.price,
      arrival: req.body.arrival,
      depature: req.body.depature,
    };

    const response = db
      .collection(BUS_COLLECTION)
      .doc(id.toString())
      .set(busJson);
    res.send(response);
  } catch (error) {
    console.log(error);
    res.send(error);
  }
});

const checkAllSeatsAreAvailable = (seats, selectedSeats) => {
  let available = true;
  selectedSeats.forEach((seatNo) => {
    if (!(seatNo in seats) || seats[seatNo].booked) {
      available = false;
    }
  });
  return available;
};

app.post("/book", bodyParser.json(), async (req, res) => {
  try {
    const { id, userId, seats } = req.body;

    const busRef = db.collection(BUS_COLLECTION).doc(id.toString());
    const bus = (await busRef.get()).data();
    if (!checkAllSeatsAreAvailable(bus.seats, seats)) {
      return res.status(400).json();
    }

    seats.forEach((seatNo) => {
      busRef.update({
        [`seats.${seatNo}`]: {
          booked: true,
          bookedBy: userId,
        },
      });
    });

    res.send();
  } catch (error) {
    console.log(error);
    res.send(error);
  }
});

const mapBusDto = (bus) => {
  Object.keys(bus.seats).forEach((seatKey) => {
    delete bus.seats[seatKey].bookedBy;
  });
  return bus;
};

app.get("/availableBuses", async (req, res) => {
  try {
    const busRef = db.collection(BUS_COLLECTION);
    const response = await busRef.get();
    let responseArr = [];

    response.forEach((doc) => {
      const bus = doc.data();
      if (Object.values(bus.seats).some((seat) => seat.booked !== true)) {
        const busDto = mapBusDto(bus);
        responseArr.push(busDto);
      }
    });

    res.send(responseArr);
  } catch (error) {
    console.log(error);
    res.send(error);
  }
});

app.get("/bus/:id", async (req, res) => {
  try {
    const busRef = db.collection(BUS_COLLECTION).doc(req.params.id);
    const response = await busRef.get();
    res.send(mapBusDto(response.data()));
  } catch (error) {
    res.send(error);
  }
});

exports.app = functions.https.onRequest(app);
