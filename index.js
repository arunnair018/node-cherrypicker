import './config.js'
import express from 'express';
import cors from 'cors'
import bodyParser from 'body-parser'
import { router } from './src/routes/api_v1.js';
import path from 'path';

const __dirname = path.resolve();
const app = express();
const PORT = process.env.PORT || 5000;

app.use("*", cors());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(bodyParser.json());
router(app);

console.log(__dirname)

// serve static files
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/static/index.html');
});

app.listen(PORT, async () => {
  console.log(`server started, listening at port ${PORT}`);
});