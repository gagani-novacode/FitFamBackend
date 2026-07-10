import Subscriber from "../models/Subscriber.model.js";

export const subscribeNewsletter = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ ok: false, error: "Email is required" });
    }

    const exists = await Subscriber.findOne({ email });
    if (exists) {
      return res.status(400).json({ ok: false, error: "You are already subscribed!" });
    }

    await Subscriber.create({ email });

    res.status(201).json({ ok: true, message: "Successfully subscribed to the newsletter!" });
  } catch (error) {
    console.error("Newsletter error:", error);
    res.status(500).json({ ok: false, error: "Failed to subscribe" });
  }
};
