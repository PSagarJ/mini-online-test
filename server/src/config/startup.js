const bcrypt = require('bcryptjs');
const SchoolClass = require('../models/SchoolClass');
const User = require('../models/User');
const { MAIN_ADMIN_EMAIL, MAIN_ADMIN_PASSWORD } = require('./mainAdmin');

const runStartupTasks = async () => {
  try {
    // 1. Ensure Class 1 to Class 12 exist if no classes exist
    const classCount = await SchoolClass.countDocuments();
    if (classCount === 0) {
      console.log('Initializing default classes (Class 1 to Class 12)...');
      const defaultClasses = Array.from({ length: 12 }, (_, i) => ({
        name: `Class ${i + 1}`,
        order: i + 1
      }));
      await SchoolClass.insertMany(defaultClasses);
      console.log('Default classes initialized successfully.');
    }

    // 2. Ensure Main Admin exists and sync password
    const normalizedEmail = MAIN_ADMIN_EMAIL.toLowerCase();
    const existingAdmin = await User.findOne({ email: normalizedEmail });
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(MAIN_ADMIN_PASSWORD, salt);

    if (!existingAdmin) {
      console.log('Creating Main Admin account...');
      await User.create({
        name: 'Main Admin',
        email: normalizedEmail,
        passwordHash,
        role: 'admin'
      });
      console.log(`Main admin (${normalizedEmail}) created.`);
    } else {
      let updated = false;
      if (existingAdmin.role !== 'admin') {
        existingAdmin.role = 'admin';
        updated = true;
      }
      existingAdmin.passwordHash = passwordHash;
      await existingAdmin.save();
      console.log(`Main admin (${normalizedEmail}) password hash and admin role verified.`);
    }
  } catch (err) {
    console.error('Error during startup tasks:', err);
  }
};

module.exports = runStartupTasks;
