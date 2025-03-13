const express = require("express");
const router = express.Router();
const client = require("../whatsappClient");
const supabase = require("../supabaseClient");

/**
 * @swagger
 * /otp/request:
 *   post:
 *     summary: Request an OTP
 *     description: Sends a one-time password (OTP) to the specified phone number via WhatsApp.
 *     tags:
 *       - OTP
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
 *     responses:
 *       200:
 *         description: OTP successfully sent.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Missing required phone number field.
 *       500:
 *         description: Internal server error or WhatsApp not connected.
 */
router.post("/request", async (req, res) => {
  try {
    const { number } = req.body;
    if (!number)
      return res
        .status(400)
        .json({ success: false, error: "Nomor WhatsApp wajib diisi" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const chatId = `${number}@s.whatsapp.net`;

    const { data, error } = await supabase
      .from("otp_requests")
      .select("id, otp_code")
      .eq("phone_number", number)
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    if (data) {
      const { error: updateError } = await supabase
        .from("otp_requests")
        .update({
          otp_code: otp,
        })
        .eq("id", data.id);

      if (updateError) {
        console.error("❌ ERROR saat update otp:", updateError);
        return res
          .status(500)
          .json({ success: false, error: "Gagal memperbarui kode otp" });
      }
    } else {
      const { error: insertError } = await supabase
        .from("otp_requests")
        .insert([{ phone_number: number, otp_code: otp }]);

      if (insertError) {
        console.error("❌ ERROR saat insert otp:", insertError);
        return res
          .status(500)
          .json({ success: false, error: "Gagal menyimpan kode otp" });
      }
    }

    await client.sendMessage(`${number}@c.us`, `Your OTP Code: ${otp}`);
    res.json({ success: true, message: "OTP sent" });
  } catch (error) {
    console.error("❌ ERROR saat mengirim OTP:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to send OTP", error });
  }
});

/**
 * @swagger
 * /otp/verify:
 *   post:
 *     summary: Verify an OTP
 *     description: Checks if the provided OTP matches the one sent to the phone number.
 *     tags:
 *       - OTP
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
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: OTP is valid.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid OTP or missing required fields.
 *       500:
 *         description: Internal server error.
 */
router.post("/verify", async (req, res) => {
  try {
    const { number, otp } = req.body;
    if (!number || !otp)
      return res
        .status(400)
        .json({ success: false, error: "Nomor dan OTP wajib diisi" });

    // Cek OTP di Supabase
    const { data, error } = await supabase
      .from("otp_requests")
      .select("*")
      .eq("phone_number", number)
      .eq("otp_code", otp)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error || !data.length)
      return res.status(400).json({
        success: false,
        error: "OTP tidak valid atau sudah kadaluarsa",
      });

    // Hapus OTP setelah berhasil diverifikasi
    const { error: deleteError } = await supabase
      .from("otp_requests")
      .delete()
      .eq("phone_number", number)
      .eq("otp_code", otp);

    if (deleteError) {
      console.error("❌ ERROR saat menghapus OTP:", deleteError);
      return res.status(500).json({
        success: false,
        error: "Verifikasi berhasil, tetapi gagal menghapus OTP",
      });
    }

    res.json({ success: true, message: "OTP valid" });
  } catch (error) {
    console.error("❌ ERROR saat verifikasi OTP:", error);
    res.status(500).json({ success: false, error: "Gagal verifikasi OTP" });
  }
});

module.exports = router;
