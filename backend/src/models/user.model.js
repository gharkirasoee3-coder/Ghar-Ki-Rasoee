const admin = require("../config/firebase.config");
const db = admin.firestore();

class UserModel {
  static collection = db.collection("users");

  static async createOrUpdateUser(uid, userData) {
    await this.collection.doc(uid).set(userData, { merge: true });
    return { uid, ...userData };
  }

  static async getUser(uid) {
    const doc = await this.collection.doc(uid).get();
    if (!doc.exists) return null;
    return { uid: doc.id, ...doc.data() };
  }

  static async updateAddress(uid, addressInfo) {
    await this.collection.doc(uid).update({
      address: addressInfo.address,
      area: addressInfo.area,
      phone: addressInfo.phone,
    });
    return this.getUser(uid);
  }

  static async addSavedAddress(uid, address) {
    await this.collection.doc(uid).update({
      savedAddresses: admin.firestore.FieldValue.arrayUnion(address),
    });
    return this.getUser(uid);
  }
}

module.exports = UserModel;
