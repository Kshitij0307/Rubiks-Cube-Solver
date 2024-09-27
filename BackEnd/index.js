const express = require("express");
const cors = require('cors');

const app = express();

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cors({
    origin: 'http://localhost:5174', 
    credentials: true               
}));

app.post('/solve-cube',(req,res) => {
    res.status(200).send("Cube Solved");
});

  app.listen(3000,()=> {
    console.log("Server started")
});