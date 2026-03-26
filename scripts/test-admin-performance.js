#!/usr/bin/env node

// Performance Test Runner
// Run this script to compare old vs optimized admin dashboard performance
// Usage: node scripts/test-admin-performance.js [quick|full]

const { runQuickPerformanceTest, runPerformanceComparison, testConfig } = require('../lib/performance-test.ts')

async function main() {
  const testType = process.argv[2] || 'quick'
  
  console.log('🚀 Admin Dashboard Performance Testing Tool')
  console.log('=' .repeat(60))
  console.log(`Test Mode: ${testType}`)
  console.log('')

  try {
    switch (testType) {
      case 'quick':
        console.log('Running quick performance test...')
        await runQuickPerformanceTest()
        break
      
      case 'full':
        console.log('Running comprehensive performance comparison...')
        await runPerformanceComparison()
        break
      
      case 'light':
        console.log('Running light load scenario...')
        await testConfig.runScenario('Light Load')
        break
      
      case 'medium':
        console.log('Running medium load scenario...')
        await testConfig.runScenario('Medium Load')
        break
      
      case 'heavy':
        console.log('Running heavy load scenario...')
        await testConfig.runScenario('Heavy Load')
        break
      
      default:
        console.log('❌ Invalid test type. Available options:')
        console.log('  quick   - Quick performance test (default)')
        console.log('  full    - Comprehensive performance comparison')
        console.log('  light   - Light load test scenario')
        console.log('  medium  - Medium load test scenario')
        console.log('  heavy   - Heavy load test scenario')
        process.exit(1)
    }
    
    console.log('\n✅ Performance testing completed!')
    
  } catch (error) {
    console.error('❌ Performance test failed:', error.message)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = { main }