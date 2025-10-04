// Quick Test Script for Browser Console
// Copy and paste these commands into your browser console to test components

console.log('🧪 Swiss Jass - Quick Test Commands');
console.log('====================================\n');

// TEST 1: Trigger Error Boundary
console.log('TEST 1: Trigger Error Boundary');
console.log('Run this command to cause an error:');
console.log('localStorage.setItem("jassUser", "{invalid json}"); location.reload();');
console.log('');

// TEST 2: Check if Loading components are available
console.log('TEST 2: Verify Components Loaded');
console.log('Check if error boundary is active:');
console.log('document.querySelector("[style*=\'error\']") ? "✅ Found" : "❌ Not found"');
console.log('');

// TEST 3: Simulate slow network
console.log('TEST 3: Simulate Slow Network');
console.log('1. Open DevTools → Network tab');
console.log('2. Select "Slow 3G" from throttling dropdown');
console.log('3. Click "Create table" and watch loading state');
console.log('');

// TEST 4: Force Empty State
console.log('TEST 4: View Empty States');
console.log('Navigate to Tables tab with no tables created');
console.log('Navigate to Friends tab with no friends added');
console.log('');

// TEST 5: Test Keyboard Navigation
console.log('TEST 5: Keyboard Navigation');
console.log('1. Press Tab repeatedly');
console.log('2. Should see focus indicators on buttons');
console.log('3. Press Enter to activate focused button');
console.log('');

// TEST 6: Check Accessibility
console.log('TEST 6: Accessibility Audit');
console.log('1. Open DevTools → Lighthouse tab');
console.log('2. Select "Accessibility" only');
console.log('3. Click "Generate report"');
console.log('4. Target score: ≥90');
console.log('');

// Helper function to clear error
window.clearTestError = function() {
  localStorage.removeItem('jassUser');
  localStorage.removeItem('jassToken');
  console.log('✅ Cleared test data. Reload page to see login.');
};

// Helper function to check component status
window.checkComponents = function() {
  console.log('\n🔍 Component Check:');
  
  // Check if React is loaded
  const hasReact = window.React !== undefined;
  console.log(`React: ${hasReact ? '✅' : '❌'}`);
  
  // Check for error boundary elements
  const hasErrorBoundary = document.querySelector('[class*="error"]') !== null;
  console.log(`Error Boundary Present: ${hasErrorBoundary ? '✅' : '❌'}`);
  
  // Check for loading indicators
  const hasLoadingIndicator = document.querySelector('[class*="spinner"]') !== null ||
                               document.querySelector('[class*="loading"]') !== null;
  console.log(`Loading Components: ${hasLoadingIndicator ? '✅ Visible' : 'ℹ️ Not currently showing'}`);
  
  // Check for empty states
  const hasEmptyState = document.body.textContent.includes('No Active Tables') ||
                        document.body.textContent.includes('No Friends Yet');
  console.log(`Empty States: ${hasEmptyState ? '✅ Visible' : 'ℹ️ Not currently showing'}`);
  
  console.log('\nNote: Loading and Empty states only show when conditions are met.');
};

// Helper function to measure performance
window.measureSpinnerPerformance = function() {
  console.log('\n⏱️ Measuring Spinner Performance...');
  console.log('1. Open DevTools → Performance tab');
  console.log('2. Click Record button');
  console.log('3. Trigger a loading state (e.g., create table)');
  console.log('4. Stop recording after 2 seconds');
  console.log('5. Check FPS (should be 60fps)');
};

// Helper function to test all components
window.runQuickTests = function() {
  console.log('\n🚀 Running Quick Component Tests...\n');
  
  checkComponents();
  
  console.log('\n📋 Manual Tests Required:');
  console.log('1. Trigger error: localStorage.setItem("jassUser", "{bad}"); location.reload();');
  console.log('2. Create table and watch loading spinner');
  console.log('3. Go to Friends tab and check empty state');
  console.log('4. Use Tab key to test keyboard navigation');
  console.log('\nRun clearTestError() to reset after error test.');
};

// Auto-run on load
console.log('\n💡 Available Commands:');
console.log('- checkComponents()           → Check component status');
console.log('- runQuickTests()            → Run all automated tests');
console.log('- clearTestError()           → Clear test data');
console.log('- measureSpinnerPerformance() → Performance testing guide');
console.log('\n🎯 Start with: runQuickTests()');
