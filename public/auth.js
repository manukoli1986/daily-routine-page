// ===== User Authentication System =====

(() => {
  'use strict';

  const USERS_KEY = 'dailyRoutineUsers';
  const CURRENT_USER_KEY = 'currentUser';
  const USER_ROUTINES_PREFIX = 'dailyRoutineData_';
  const USER_TEMPLATES_PREFIX = 'dailyRoutineTemplates_';

  // ===== Get All Users =====
  function getAllUsers() {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) {
      try { return JSON.parse(raw); } catch { return {}; }
    }
    return {};
  }

  function saveAllUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  // ===== Get Current User =====
  function getCurrentUser() {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (raw) {
      try { return JSON.parse(raw); } catch { return null; }
    }
    return null;
  }

  function setCurrentUser(user) {
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  }

  // ===== Simple Password Hashing (Not cryptographically secure, for demo) =====
  function hashPassword(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  // ===== User Registration =====
  function registerUser(username, password, email) {
    const users = getAllUsers();

    if (users[username]) {
      return { success: false, message: 'Username already exists' };
    }

    if (!username || username.length < 3) {
      return { success: false, message: 'Username must be at least 3 characters' };
    }

    if (!password || password.length < 6) {
      return { success: false, message: 'Password must be at least 6 characters' };
    }

    users[username] = {
      username,
      passwordHash: hashPassword(password),
      email: email || '',
      createdAt: new Date().toISOString(),
      role: 'user',
    };

    saveAllUsers(users);
    return { success: true, message: 'Account created successfully!' };
  }

  // ===== User Login =====
  function loginUser(username, password) {
    const users = getAllUsers();
    const user = users[username];

    if (!user) {
      return { success: false, message: 'User not found' };
    }

    if (user.passwordHash !== hashPassword(password)) {
      return { success: false, message: 'Invalid password' };
    }

    const loggedInUser = {
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };

    setCurrentUser(loggedInUser);
    return { success: true, message: 'Logged in successfully!', user: loggedInUser };
  }

  // ===== User Logout =====
  function logoutUser() {
    setCurrentUser(null);
  }

  // ===== Update User Profile =====
  function updateUserProfile(username, updates) {
    const users = getAllUsers();
    const user = users[username];

    if (!user) {
      return { success: false, message: 'User not found' };
    }

    if (updates.email) {
      user.email = updates.email;
    }

    if (updates.newPassword) {
      if (!updates.currentPassword || hashPassword(updates.currentPassword) !== user.passwordHash) {
        return { success: false, message: 'Current password is incorrect' };
      }
      user.passwordHash = hashPassword(updates.newPassword);
    }

    saveAllUsers(users);

    // Update current user session
    const currentUser = getCurrentUser();
    if (currentUser && currentUser.username === username) {
      currentUser.email = user.email;
      setCurrentUser(currentUser);
    }

    return { success: true, message: 'Profile updated successfully!' };
  }

  // ===== Delete User Account =====
  function deleteUserAccount(username, password) {
    const users = getAllUsers();
    const user = users[username];

    if (!user) {
      return { success: false, message: 'User not found' };
    }

    if (user.passwordHash !== hashPassword(password)) {
      return { success: false, message: 'Invalid password' };
    }

    // Delete user data
    delete users[username];
    saveAllUsers(users);

    // Clear user-specific data
    const keysToDelete = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(USER_ROUTINES_PREFIX + username + '_') || 
          key.startsWith(USER_TEMPLATES_PREFIX + username + '_')) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => localStorage.removeItem(key));

    // Logout user
    setCurrentUser(null);

    return { success: true, message: 'Account deleted' };
  }

  // ===== Get User Routines Data Key =====
  function getUserRoutinesKey(username) {
    return USER_ROUTINES_PREFIX + username;
  }

  // ===== Get User Templates Data Key =====
  function getUserTemplatesKey(username) {
    return USER_TEMPLATES_PREFIX + username;
  }

  // ===== API for use in other scripts =====
  window.AuthAPI = {
    registerUser,
    loginUser,
    logoutUser,
    getCurrentUser,
    updateUserProfile,
    deleteUserAccount,
    getUserRoutinesKey,
    getUserTemplatesKey,
    getAllUsers, // For debugging
  };

})();
