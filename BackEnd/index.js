const express = require("express");
const cors = require('cors');

const app = express();

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cors({
    origin: '*', // Allows requests from any origin
    credentials: true // Allow credentials (cookies, authorization headers, etc.)
}));

app.post('/solve-cube',(req,res) => {
    const colors = req.body.colors;
    console.log(colors);
    res.status(200).send("Cube Solved");
});

  app.listen(3000,()=> {
    console.log("Server started")
});