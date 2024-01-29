require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();
const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI);

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  phone_number: String,
  vehicle_type: String,
});

const petrolLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  date: Date,
  odometer_reading: Number,
  petrol_price: Number,
  petrol_volume: Number,
  station: String,
});


const User = mongoose.model('User', userSchema);
const PetrolLog = mongoose.model('PetrolLog', petrolLogSchema);

app.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone_number, vehicle_type } = req.body;


    const hashedPassword = await bcrypt.hash(password, 10);

 
    const user = new User({ name, email, password: hashedPassword, phone_number, vehicle_type });

    await user.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    console.log(user)
    
    if (user && await bcrypt.compare(password, user.password)) {
    
      const token = jwt.sign({ userId: user._id }, "masai", { expiresIn: '1h' });
      res.json({ token });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
   
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Err' });
  }
});


const authenticateUser = (req, res, next) => {
  const token = req.headers.authorization.split(" ")[1]
  console.log(token)
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  jwt.verify(token, "masai", (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    req.userId = decoded.userId;
    next();
  });
};

app.use(authenticateUser);
 
app.post('/petrol-logs', async (req, res) => {
  try {
    const { date, odometer_reading, petrol_price, petrol_volume, station } = req.body;

    const petrolLog = new PetrolLog({
      user: req.userId,
      date,
      odometer_reading,
      petrol_price,
      petrol_volume,
      station,
    });

   
    await petrolLog.save();

    res.status(201).json({ message: 'Petrol log created successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
app.get('/petrol-logs', async (req, res) => {
  try {
    const { station } = req.query;
    const filter = station ? { user: req.userId, station } : { user: req.userId };
    const petrolLogs = await PetrolLog.find(filter);
    res.json(petrolLogs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.put('/petrol-logs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, odometer_reading, petrol_price, petrol_volume, station } = req.body;

    const updatedPetrolLog = await PetrolLog.findOneAndUpdate(
      { _id: id, user: req.userId },
      { date, odometer_reading, petrol_price, petrol_volume, station },
      { new: true }
    );

    if (!updatedPetrolLog) {
      return res.status(404).json({ error: 'Petrol log not found' });
    }

    res.json({ message: 'Petrol log updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.delete('/petrol-logs/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await PetrolLog.deleteOne({ _id: id, user: req.userId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Petrol log not found' });
    }

    res.json({ message: 'Petrol log deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
