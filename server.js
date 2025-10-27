import Gun from "gun";
import http from "http";
import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(Gun.serve);

const server = http.createServer(app);

// jalankan Gun dengan RAM-only mode (super cepat)
Gun({ web: server, radisk: false, localStorage: false });

const PORT = 8765;
server.listen(PORT, "0.0.0.0", () =>
  console.log(`Gun relay on http://192.168.1.4:${PORT}/gun`)
);
