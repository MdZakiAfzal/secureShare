require('dotenv').config()
const app = require(`${__dirname}/app`)
const mongoose = require('mongoose');

/*
const DBString = process.env.DB_STRING
mongoose.connect(DBString)
    .then(()=> console.log('DB connected successfully!'))
    .catch(err => console.log(err));

//startMoralis();

const port = process.env.PORT || 3000
app.listen(port, ()=>{
    console.log(`server is running on port ${port}...`)
});*/



const port = process.env.PORT || 3000;
const DBString = process.env.DB_STRING;
async function startServer() {
  try {
    // 1. Await the database connection
    await mongoose.connect(DBString);
    console.log('DB connected successfully!');

    // 2. Start the Express server ONLY after all connections are ready
    app.listen(port, () => {
      console.log(`Server is running on port ${port}...`);
    });

  } catch (err) {
    console.error("Failed to start the application:", err);
    process.exit(1);
  }
}

startServer();