import * as fs from 'fs'
import * as path from 'path'

interface CheckResult {
  name: string
  status: 'pass' | 'fail' | 'warning'
  message: string
}

async function runDeploymentChecks(): Promise<void> {
  console.log('🔍 Running pre-deployment checks...\n')

  const checks: CheckResult[] = []

  // Check 1: Environment variables template exists
  const envExamplePath = path.join(process.cwd(), '.env.example')
  if (fs.existsSync(envExamplePath)) {
    checks.push({
      name: 'Environment Template',
      status: 'pass',
      message: '.env.example file exists',
    })
  } else {
    checks.push({
      name: 'Environment Template',
      status: 'fail',
      message: '.env.example file is missing',
    })
  }

  // Check 2: Package.json has required scripts
  const packageJsonPath = path.join(process.cwd(), 'package.json')
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
    const requiredScripts = ['build', 'start', 'dev']
    const hasAllScripts = requiredScripts.every(script => packageJson.scripts?.[script])

    if (hasAllScripts) {
      checks.push({
        name: 'Package Scripts',
        status: 'pass',
        message: 'All required scripts are present',
      })
    } else {
      checks.push({
        name: 'Package Scripts',
        status: 'fail',
        message: 'Missing required scripts in package.json',
      })
    }
  }

  // Check 3: Prisma schema exists
  const prismaSchemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma')
  if (fs.existsSync(prismaSchemaPath)) {
    checks.push({
      name: 'Prisma Schema',
      status: 'pass',
      message: 'schema.prisma file exists',
    })
  } else {
    checks.push({
      name: 'Prisma Schema',
      status: 'fail',
      message: 'schema.prisma file is missing',
    })
  }

  // Check 4: NextAuth configuration
  const authConfigPath = path.join(process.cwd(), 'lib', 'auth.ts')
  if (fs.existsSync(authConfigPath)) {
    checks.push({
      name: 'NextAuth Config',
      status: 'pass',
      message: 'auth.ts configuration exists',
    })
  } else {
    checks.push({
      name: 'NextAuth Config',
      status: 'fail',
      message: 'auth.ts configuration is missing',
    })
  }

  // Check 5: Middleware exists
  const middlewarePath = path.join(process.cwd(), 'middleware.ts')
  if (fs.existsSync(middlewarePath)) {
    checks.push({
      name: 'Middleware',
      status: 'pass',
      message: 'middleware.ts exists',
    })
  } else {
    checks.push({
      name: 'Middleware',
      status: 'warning',
      message: 'middleware.ts is missing (optional)',
    })
  }

  // Check 6: Vercel configuration
  const vercelConfigPath = path.join(process.cwd(), 'vercel.json')
  if (fs.existsSync(vercelConfigPath)) {
    checks.push({
      name: 'Vercel Config',
      status: 'pass',
      message: 'vercel.json exists',
    })
  } else {
    checks.push({
      name: 'Vercel Config',
      status: 'warning',
      message: 'vercel.json is missing (Vercel will use defaults)',
    })
  }

  // Check 7: .gitignore includes sensitive files
  const gitignorePath = path.join(process.cwd(), '.gitignore')
  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8')
    const hasEnvLocal = gitignoreContent.includes('.env*.local')
    const hasEnv = gitignoreContent.includes('.env')

    if (hasEnvLocal || hasEnv) {
      checks.push({
        name: 'Git Security',
        status: 'pass',
        message: '.gitignore properly excludes .env files',
      })
    } else {
      checks.push({
        name: 'Git Security',
        status: 'fail',
        message: '.gitignore does not exclude .env files!',
      })
    }
  }

  // Print results
  console.log('📊 Check Results:\n')
  checks.forEach(check => {
    const icon = check.status === 'pass' ? '✅' : check.status === 'warning' ? '⚠️' : '❌'
    console.log(`${icon} ${check.name}: ${check.message}`)
  })

  const failedChecks = checks.filter(c => c.status === 'fail')
  const warningChecks = checks.filter(c => c.status === 'warning')

  console.log('\n' + '='.repeat(60))

  if (failedChecks.length === 0) {
    console.log('\n🎉 All critical checks passed!')
    if (warningChecks.length > 0) {
      console.log(`⚠️  ${warningChecks.length} warning(s) - review recommended`)
    }
    console.log('\n✅ Ready for deployment to Vercel!\n')
    console.log('📋 Deployment Checklist:')
    console.log('1. Push code to GitHub')
    console.log('2. Import project in Vercel')
    console.log('3. Add environment variables in Vercel')
    console.log('4. Deploy!')
  } else {
    console.log(`\n❌ ${failedChecks.length} critical check(s) failed!`)
    console.log('\nPlease fix the issues above before deploying.\n')
    process.exit(1)
  }
}

if (require.main === module) {
  runDeploymentChecks().catch(error => {
    console.error('Error running checks:', error)
    process.exit(1)
  })
}

export { runDeploymentChecks }
