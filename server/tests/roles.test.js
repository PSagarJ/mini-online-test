const { test, describe } = require('node:test');
const assert = require('node:assert');
const { MAIN_ADMIN_EMAIL } = require('../src/config/mainAdmin');

describe('User Security & Role Immutability Rules', () => {
  // Logic validator mirroring server/src/routes/admin.js & middleware/auth.js
  function validateUserUpdate(currentUser, targetUser, newRole) {
    // 1. The main admin cannot be changed or demoted
    if (targetUser.email.toLowerCase() === MAIN_ADMIN_EMAIL.toLowerCase()) {
      return { allowed: false, error: 'The main admin cannot be modified.' };
    }

    // 2. Nobody can remove their own admin role
    if (targetUser.id === currentUser.id && newRole === 'student') {
      return { allowed: false, error: 'You cannot remove your own admin role.' };
    }

    // 3. Valid roles
    if (newRole && !['student', 'admin'].includes(newRole)) {
      return { allowed: false, error: 'Invalid role.' };
    }

    return { allowed: true };
  }

  test('blocks demotion or modification of the Main Admin', () => {
    const adminUser = { id: 'admin1', email: 'anotheradmin@school.edu', role: 'admin' };
    const mainAdminTarget = { id: 'main1', email: MAIN_ADMIN_EMAIL, role: 'admin' };

    const result = validateUserUpdate(adminUser, mainAdminTarget, 'student');
    assert.strictEqual(result.allowed, false);
    assert.strictEqual(result.error, 'The main admin cannot be modified.');
  });

  test('blocks an administrator from removing their own admin role', () => {
    const adminUser = { id: 'admin2', email: 'teacher@school.edu', role: 'admin' };

    const result = validateUserUpdate(adminUser, adminUser, 'student');
    assert.strictEqual(result.allowed, false);
    assert.strictEqual(result.error, 'You cannot remove your own admin role.');
  });

  test('allows promoting a student to admin and demoting another admin (excluding main admin)', () => {
    const adminCaller = { id: 'admin3', email: 'super@school.edu', role: 'admin' };
    const studentUser = { id: 'student1', email: 'student@school.edu', role: 'student' };
    const otherAdmin = { id: 'admin4', email: 'colleague@school.edu', role: 'admin' };

    // Promote student
    const promoteResult = validateUserUpdate(adminCaller, studentUser, 'admin');
    assert.strictEqual(promoteResult.allowed, true);

    // Demote other admin
    const demoteResult = validateUserUpdate(adminCaller, otherAdmin, 'student');
    assert.strictEqual(demoteResult.allowed, true);
  });
});
