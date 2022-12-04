import './config.js'
import express from 'express';
import cors from 'cors'
import bodyParser from 'body-parser'
import mongoose from 'mongoose';
import {Logs} from './src/db/models/logSchema.js';
import { router } from './src/routes/api_v1.js';


const app = express(); // create express app

const PORT = process.env.PORT || 5000;

// bypass cors:
app.use("*", cors());

// mongodb atlas configuration
const mongo_url = `mongodb://localhost:27017/cherrypicker`;
mongoose.connect(mongo_url, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

//  bodyParser to parse incoming request bodies in a middleware before our handlers
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(bodyParser.json());

//passing the app to router
router(app);

// Serve static files from the React app
// if (process.env.NODE_ENV === "production") {
//   app.use(express.static(path.join(__dirname, "client/build")));
// }

//server listening on localhost port 3000
app.listen(PORT, async () => {
  console.log(`server started, listening at port ${PORT}`);
});