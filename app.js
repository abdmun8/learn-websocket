const express = require("express");
const { rateLimit } = require("express-rate-limit");
const { WebSocketServer } = require("ws");

const app = express();

const wss = new WebSocketServer({ noServer: true, path: "/ws" });

const limit = rateLimit({
  windowMs: 1 * 60 * 1000,
  limit: 1,
  standardHeaders: "draft-7", // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
});

app.use(limit);

app.get("/", (req, res) => {
  res.send("Hello");
});

app.get("/ws-ui", (req, res) => {
  res.send(
    `<div>WS Page</div>
    <script>
    const socket = new WebSocket('ws://localhost:4000/ws');
    socket.onopen = function(e) {
        alert("[open] Connection established");
        alert("Sending to server");
        socket.send("My name is John");
    };
    socket.onclose = function(event) {
        console.log({event})
        if (event.wasClean) {
            alert('[close] Connection closed cleanly');
        } else {
            // e.g. server process killed or network down
            // event.code is usually 1006 in this case
            alert('[close] Connection died');
        }
    };
      
    socket.onerror = function(error) {
        console.log({error})
        alert('error');
    };
    
    </script>`
  );
});

const server = app.listen(4000, () => {
  console.log("listen on port 4000");
});

server.on("upgrade", (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => {
    console.log({ head });
    wss.emit("connection", ws, req);
  });
});

wss.on("connection", (wsconn, req) => {
  console.log({ wsconn, req });
  wsconn.on("message", (msg) => {
    console.log({ msg: msg.toString() });
    const splitted = msg.toString().split(" ");
    wsconn.send("Your message received, " + splitted[splitted.length - 1]);

    let count = 0;
    const interval = setInterval(() => {
      if (count === 5) {
        clearInterval(interval);
        wsconn.send("new data has arrived, connection wil closed in 3s");
        setTimeout(() => {
          wsconn.close();
        }, 3000);
      } else {
        wsconn.send("No new data available");
      }

      count++;
    }, 1000);

    setTimeout(() => {
      wsconn.close();
    }, 3000);
  });
});
