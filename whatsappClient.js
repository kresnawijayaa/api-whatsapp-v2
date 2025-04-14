const { Client, LocalAuth } = require("whatsapp-web.js");

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { headless: true },
});

client.on("qr", (qr) => {
  console.log("Scan QR Code ini untuk login:");
  require("qrcode-terminal").generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("WhatsApp Client is ready!");
});

client.on("message", async (message) => {
  if (message.from.includes("@g.us")) {
    console.log(`Pesan diterima dari grup dengan ID: ${message.from}. Pesan: ${message.body}`);
  } else {
    console.log(`Pesan diterima dari nomor: ${message.from}`);
  }
});

client.initialize();

module.exports = client;
