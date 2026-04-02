const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;

exports.getSession = async (req, res) => {
    try {
        const session = await stripe.checkout.sessions.retrieve(req.params.id, {
            expand: ['line_items'],
        });

        if (!session) {
            return res.status(404).json({ message: "Session not found" });
        }

        // console.log("session:::", session);
        res.status(200).json({ session });
    } catch (error) {
        console.error("Stripe getSession error:", error.message);
 
        res.status(500).json({
            message: "Failed to retrieve session",
            error: error.message,
        });
    }
};
