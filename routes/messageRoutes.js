const express = require("express");
const router = express.Router();
const client = require("../whatsappClient");
const { MessageMedia } = require("whatsapp-web.js");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * @swagger
 * /message/send:
 *   post:
 *     summary: Send a personal message
 *     description: Send a message to an individual contact.
 *     tags:
 *       - Message
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               number:
 *                 type: string
 *                 example: "6281314250902"
 *               message:
 *                 type: string
 *                 example: "Halo, ini personal message!"
 *     responses:
 *       200:
 *         description: Pesan berhasil dikirim.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Pesan berhasil dikirim"
 *       400:
 *         description: Nomor dan pesan wajib diisi atau nomor tidak valid.
 *       500:
 *         description: WhatsApp belum terhubung atau gagal mengirim pesan.
 */
router.post("/send", async (req, res) => {
  const { number, message } = req.body;
  const formattedNumber = number.includes("@c.us") ? number : `${number}@c.us`;

  try {
    await client.sendMessage(formattedNumber, message);
    res.json({ success: true, message: "Message sent successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to send message", error });
  }
});

/**
 * @swagger
 * /message/send-group:
 *   post:
 *     summary: Send a message to a group
 *     description: Send a message to a WhatsApp group using its ID.
 *     tags:
 *       - Message
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               groupId:
 *                 type: string
 *                 example: "120363407810956154"
 *               message:
 *                 type: string
 *                 example: "Halo, ini group message!"
 *     responses:
 *       200:
 *         description: Pesan berhasil dikirim ke grup.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Pesan berhasil dikirim ke grup"
 *       400:
 *         description: ID grup dan pesan wajib diisi.
 *       500:
 *         description: WhatsApp belum terhubung atau gagal mengirim pesan ke grup.
 */
router.post("/send-group", async (req, res) => {
  const { groupId, message } = req.body;

  try {
    await client.sendMessage(`${groupId}@g.us`, message);
    res.json({ success: true, message: "Message sent to group" });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to send group message", error });
  }
});

/**
 * @swagger
 * /message/broadcast:
 *   post:
 *     summary: Send a broadcast message
 *     description: Send a message to multiple contacts at once.
 *     tags:
 *       - Message
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               numbers:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["6281314250902", "6281234567890"]
 *               message:
 *                 type: string
 *                 example: "Halo, ini broadcast message!"
 *     responses:
 *       200:
 *         description: Pesan broadcast dikirim.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Pesan broadcast dikirim"
 *       400:
 *         description: Daftar nomor dan pesan wajib diisi.
 *       500:
 *         description: WhatsApp belum terhubung atau gagal melakukan broadcast.
 */
router.post("/broadcast", async (req, res) => {
  const { numbers, message } = req.body;
  try {
    for (const number of numbers) {
      await client.sendMessage(`${number}@c.us`, message);
      await delay(2000); // Jeda 2 detik untuk menghindari spam
    }
    res.json({ success: true, message: "Broadcast sent successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to send broadcast", error });
  }
});

/**
 * @swagger
 * /message/send-media:
 *   post:
 *     summary: Send media (e.g., PDF) to a contact
 *     description: Send media file such as PDF to an individual contact.
 *     tags:
 *       - Message
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               number:
 *                 type: string
 *                 example: "6281314250902"
 *               file:
 *                 type: string
 *                 format: binary
 *               caption:
 *                 type: string
 *                 example: "Ini file PDF-nya ya!"
 *     responses:
 *       200:
 *         description: Media berhasil dikirim.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Media berhasil dikirim"
 *       400:
 *         description: Nomor dan file wajib diisi.
 *       500:
 *         description: Gagal mengirim media.
 */

const multer = require("multer");
const fs = require("fs");
const path = require("path");

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 5 * 1024 * 1024 }, // Max 5MB
});

router.post("/send-media", upload.single("file"), async (req, res) => {
  const { number, caption } = req.body;
  const formattedNumber = number.includes("@c.us") ? number : `${number}@c.us`;

  if (!req.file) {
    return res
      .status(400)
      .json({ success: false, message: "File wajib diunggah." });
  }

  try {
    const filePath = req.file.path;
    const fileBuffer = fs.readFileSync(filePath);
    const mimeType = req.file.mimetype;
    const fileName = req.file.originalname;

    const media = new MessageMedia(
      mimeType,
      fileBuffer.toString("base64"),
      fileName
    );

    await client.sendMessage(formattedNumber, media, { caption });

    fs.unlinkSync(filePath); // hapus file setelah dikirim

    res.json({ success: true, message: "Media berhasil dikirim" });
  } catch (error) {
    console.error("Error kirim media:", error); // log ke terminal
    res
      .status(500)
      .json({ success: false, message: "Gagal mengirim media", error });
  }
});

/**
 * @swagger
 * /message/send-group-media:
 *   post:
 *     summary: Send media (e.g., PDF) to a group
 *     description: Send media file such as PDF to a WhatsApp group.
 *     tags:
 *       - Message
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               groupId:
 *                 type: string
 *                 example: "120363407810956154"
 *               file:
 *                 type: string
 *                 format: binary
 *               caption:
 *                 type: string
 *                 example: "Ini file PDF-nya ya!"
 *     responses:
 *       200:
 *         description: Media berhasil dikirim ke grup.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Media berhasil dikirim ke grup"
 *       400:
 *         description: ID grup dan file wajib diisi.
 *       500:
 *         description: Gagal mengirim media ke grup.
 */
router.post("/send-group-media", upload.single("file"), async (req, res) => {
  const { groupId, caption } = req.body;

  const formattedGroupId = groupId.includes("@g.us")
    ? groupId
    : `${groupId}@g.us`;

  if (!req.file) {
    return res
      .status(400)
      .json({ success: false, message: "File wajib diunggah." });
  }

  try {
    const filePath = req.file.path;
    const fileBuffer = fs.readFileSync(filePath);
    const mimeType = req.file.mimetype;
    const fileName = req.file.originalname;

    const media = new MessageMedia(
      mimeType,
      fileBuffer.toString("base64"),
      fileName
    );

    await client.sendMessage(formattedGroupId, media, { caption });

    fs.unlinkSync(filePath); // hapus file setelah dikirim

    res.json({ success: true, message: "Media berhasil dikirim" });
  } catch (error) {
    console.error("Error kirim media:", error); // log ke terminal
    res
      .status(500)
      .json({ success: false, message: "Gagal mengirim media", error });
  }
});

module.exports = router;
