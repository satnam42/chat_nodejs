require("dotenv").config();

const mongoose = require("mongoose");
mongoose.connect("mongodb://superadmin:Power$$2022@93.188.167.68:33017" + "/" + "chat" + '?authSource=admin', {
  useUnifiedTopology: true,
  useNewUrlParser: true,
});

mongoose.connection.on("error", (err) => {
  console.log("Mongoose Connection ERROR: " + err.message);
});

mongoose.connection.once("open", () => {
  console.log("MongoDB Connected!");
});

//Bring in the models
require("./models/User");
require("./models/Chatroom");
require("./models/Message");

const app = require("./app");

const server = app.listen(8000, () => {
  console.log("Server listening on port 8000");
});

const io = require("socket.io")(server, {
  allowEIO3: true,
  cors: {
    origin: true,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const jwt = require("jwt-then");

const Message = mongoose.model("Message");
const User = mongoose.model("User");

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.query.token;
    // const details = auth.extractToken(token, req.context);
    const details = await jwt.verify(token, process.env.SECRET);

    if (details.name === "TokenExpiredError") {
      throw new Error("token expired");
    }

    if (details.name === "JsonWebTokenError") {
      throw new Error("token is invalid");
    }

    // const payload = await db.user.findById(details._id)

    // const payload = await jwt.verify(token, process.env.SECRET);
    socket.userId = details.id;
    next();
  } catch (err) { }
});

io.on("connection", (socket) => {
  console.log("Connected: " + socket.userId);

  socket.on("disconnect", () => {
    console.log("Disconnected: " + socket.userId);
  });

  socket.on("joinRoom", ({ chatroomId }) => {
    socket.join(chatroomId);
    console.log("A user joined chatroom: " + chatroomId);
  });

  socket.on("leaveRoom", ({ chatroomId }) => {
    socket.leave(chatroomId);
    console.log("A user left chatroom: " + chatroomId);
  });

  socket.on("chatroomMessage", async ({ chatroomId, message }) => {
    if (message.trim().length > 0) {
      const user = await User.findOne({ _id: socket.userId });
      const newMessage = new Message({
        chatroom: chatroomId,
        user: socket.userId,
        message,
      });
      io.to(chatroomId).emit("newMessage", {
        message,
        name: user.name || "satnam",
        userId: socket.userId,
      });
      await newMessage.save();
    }
  });
});
