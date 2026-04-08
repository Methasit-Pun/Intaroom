// Clear all admin-related localStorage and cookies
// Run this in browser console if you want to clear admin session

console.log("🔄 Clearing admin session...");

// Clear localStorage items
localStorage.removeItem("isAdmin");
localStorage.removeItem("adminEmail");

// Clear cookies
document.cookie = "isAdmin=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

console.log("✅ Admin session cleared!");
console.log("💡 Refresh the page or navigate to /login to start fresh");

// Optional: redirect to login page
// window.location.href = "/login";