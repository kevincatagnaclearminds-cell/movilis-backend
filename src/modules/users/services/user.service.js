const User = require('../models/user.model');

class UserService {
  async createUser(userData) {
    const user = new User(userData);
    await user.save();
    return user;
  }

  async getUserById(userId) {
    return await User.findById(userId).select('-password');
  }

  async getUserByEmail(email) {
    return await User.findOne({ email }).select('+password');
  }

  async getAllUsers(query = {}) {
    return await User.find(query).select('-password');
  }

  async updateUser(userId, updateData) {
    return await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');
  }

  async deleteUser(userId) {
    return await User.findByIdAndDelete(userId);
  }
}

module.exports = new UserService();

