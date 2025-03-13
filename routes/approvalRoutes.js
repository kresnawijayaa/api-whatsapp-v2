const express = require("express");
const router = express.Router();
const client = require("../whatsappClient");
const supabase = require("../supabaseClient");

/**
 * @swagger
 * /approval/request:
 *   post:
 *     summary: Send an approval code
 *     description: Endpoint ini digunakan untuk mengirimkan kode approval melalui WhatsApp. Kode akan berlaku selama 10 menit.
 *     tags:
 *       - Approval
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               number:
 *                 type: string
 *                 example: "6281234567890"
 *                 description: "Nomor WhatsApp tujuan dalam format internasional tanpa tanda '+'"
 *     responses:
 *       200:
 *         description: Kode approval berhasil dikirim
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
 *                   example: "Kode approval dikirim, berlaku 10 menit"
 *       400:
 *         description: Permintaan tidak valid (misalnya nomor WhatsApp tidak diisi)
 *       500:
 *         description: Kesalahan server (misalnya WhatsApp tidak terhubung atau gagal menyimpan kode)
 */
router.post("/request", async (req, res) => {
  try {
    const { number } = req.body;
    if (!number)
      return res
        .status(400)
        .json({ success: false, error: "Nomor WhatsApp wajib diisi" });

    const approvalCode = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("approval_requests")
      .select("id, approval_code")
      .eq("phone_number", number)
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    if (data) {
      const { error: updateError } = await supabase
        .from("approval_requests")
        .update({
          approval_code: approvalCode,
          expires_at: expiresAt,
        })
        .eq("id", data.id);

      if (updateError) {
        console.error("❌ ERROR saat update approval:", updateError);
        return res
          .status(500)
          .json({ success: false, error: "Gagal memperbarui kode approval" });
      }
    } else {
      const { error: insertError } = await supabase
        .from("approval_requests")
        .insert([
          {
            phone_number: number,
            approval_code: approvalCode,
            expires_at: expiresAt,
          },
        ]);

      if (insertError) {
        console.error("❌ ERROR saat insert approval:", insertError);
        return res
          .status(500)
          .json({ success: false, error: "Gagal menyimpan kode approval" });
      }
    }

    await client.sendMessage(
      `${number}@c.us`,
      `Untuk konfirmasi, balas "${approvalCode}" pada chat ini.\n\nKode ini berlaku selama 10 menit.`
    );
    res.json({ success: true, message: "Approval code sent" });
  } catch (error) {
    console.error("❌ ERROR saat mengirim kode approval:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to send approval code", error });
  }
});

// Listener untuk mengecek approval dari user
client.on("message", async (msg) => {
  try {
    const phoneNumber = msg.from.replace("@c.us", "").trim();
    const userReply = msg.body.trim();

    const { data, error } = await supabase
      .from("approval_requests")
      .select("id, approval_code")
      .eq("phone_number", phoneNumber)
      .single();

    if (error || !data) return;

    if (userReply === data.approval_code) {
      // Jika kode cocok, balas dengan pesan approval granted
      await msg.reply("✅ Approval granted! Terima kasih.");

      // Hapus data approval dari database
      const { error: deleteError } = await supabase
        .from("approval_requests")
        .delete()
        .eq("id", data.id);

      if (deleteError) {
        console.error("❌ ERROR saat menghapus approval:", deleteError);
      }
    }
  } catch (error) {
    console.error("❌ ERROR saat memproses pesan approval:", error);
  }
});

module.exports = router;
