const session = require("express-session");
const MongoStore = require("connect-mongo");

const uriParDefaut = "mongodb://localhost:27017/hssabaty";

function configurerSession() {
  return session({
    secret: process.env.SESSION_SECRET || "changez-moi-en-production",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI || uriParDefaut,
      collectionName: "sessions",
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    },
  });
}

module.exports = { configurerSession };
