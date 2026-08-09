const admin = require("../config/firebase.config");
const ResponseUtil = require("../utils/response.util");

class TestimonialController {
  static async getAllTestimonials(req, res) {
    try {
      const db = admin.firestore();
      const snapshot = await db.collection("testimonials")
        .orderBy("createdAt", "asc")
        .get();

      let testimonials = [];
      snapshot.forEach(doc => {
        testimonials.push(doc.data());
      });

      // If empty, seed 3 default testimonials
      if (testimonials.length === 0) {
        console.log("Seeding default testimonials...");
        const defaultTestimonials = [
          {
            id: "default_1",
            name: "Aarav Sharma",
            role: "Software Engineer",
            text: "Reminds me of my mother's cooking in Delhi. The Paneer Butter Masala is out of this world! Totally worth the subscription.",
            rating: 5,
            avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
            createdAt: new Date(Date.now() - 300000).toISOString()
          },
          {
            id: "default_2",
            name: "Priya Patel",
            role: "University Student",
            text: "Super affordable, extremely fresh, and I can pause my meals on weekends. Best meal plan in Vancouver hands down!",
            rating: 5,
            avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face",
            createdAt: new Date(Date.now() - 200000).toISOString()
          },
          {
            id: "default_3",
            name: "Rohan Mehta",
            role: "Fitness Enthusiast",
            text: "Perfect high-protein options, very healthy, clean oil, and outstanding delivery times. 10/10 service!",
            rating: 5,
            avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
            createdAt: new Date(Date.now() - 100000).toISOString()
          }
        ];

        const batch = db.batch();
        defaultTestimonials.forEach(t => {
          const docRef = db.collection("testimonials").doc(t.id);
          batch.set(docRef, t);
          testimonials.push(t);
        });
        await batch.commit();
        console.log("Default testimonials seeded.");
      }

      ResponseUtil.send(res, 200, "Testimonials retrieved successfully", testimonials);
    } catch (error) {
      console.error("Error retrieving testimonials:", error);
      ResponseUtil.error(res, 500, "Failed to retrieve testimonials", error);
    }
  }

  static async upsertTestimonial(req, res) {
    try {
      const { id, name, role, text, rating, avatar } = req.body;

      if (!name || !role || !text || !rating) {
        return ResponseUtil.error(res, 400, "Name, role, text, and rating are required");
      }

      const db = admin.firestore();
      const docId = id || db.collection("testimonials").doc().id;

      const testimonialData = {
        id: docId,
        name,
        role,
        text,
        rating: Number(rating),
        avatar: avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face",
        createdAt: new Date().toISOString()
      };

      await db.collection("testimonials").doc(docId).set(testimonialData, { merge: true });

      ResponseUtil.send(res, 200, "Testimonial saved successfully", testimonialData);
    } catch (error) {
      console.error("Error saving testimonial:", error);
      ResponseUtil.error(res, 500, "Failed to save testimonial", error);
    }
  }

  static async deleteTestimonial(req, res) {
    try {
      const { id } = req.params;
      if (!id) {
        return ResponseUtil.error(res, 400, "Testimonial ID is required");
      }

      const db = admin.firestore();
      const docRef = db.collection("testimonials").doc(id);
      const doc = await docRef.get();

      if (!doc.exists) {
        return ResponseUtil.error(res, 404, "Testimonial not found");
      }

      await docRef.delete();

      ResponseUtil.send(res, 200, "Testimonial deleted successfully", { id });
    } catch (error) {
      console.error("Error deleting testimonial:", error);
      ResponseUtil.error(res, 500, "Failed to delete testimonial", error);
    }
  }
}

module.exports = TestimonialController;
