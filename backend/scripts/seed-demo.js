const path = require('node:path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const Release = require('../src/models/Release');
const ReleasePackage = require('../src/models/ReleasePackage');

dotenv.config({ path: path.join(__dirname, '../.env') });

const DEMO_RELEASE_TAG = 'demo-seed-v1';
const demoPackage = {
  package_version: 1,
  completed_features: [
    'Customers can save a preferred delivery address at checkout',
    'Order confirmation emails now include an itemized purchase summary'
  ],
  bug_fixes: [
    'Fixed a checkout issue that could display an outdated shipping estimate'
  ],
  changed_behaviour: [
    'The checkout page now asks customers to confirm their delivery address before payment'
  ],
  qa_summary:
    'QA verified address selection, shipping estimate refresh, successful payment, and the order confirmation email in staging.',
  known_limitations: [
    'Saved addresses are available only to signed-in customers'
  ],
  migration_notes: [
    'No database migration is required for this release'
  ],
  affected_user_groups: [
    'Customers placing orders',
    'Customer support agents handling order questions'
  ],
  created_by: 'demo-seed'
};

function getDatabaseName(uri) {
  let parsedUri;

  try {
    parsedUri = new URL(uri);
  } catch {
    throw new Error('DEMO_MONGO_URI must be a valid MongoDB connection URI');
  }

  if (!['mongodb:', 'mongodb+srv:'].includes(parsedUri.protocol)) {
    throw new Error('DEMO_MONGO_URI must use mongodb:// or mongodb+srv://');
  }

  return decodeURIComponent(parsedUri.pathname.replace(/^\/+/, ''));
}

async function seedDemo() {
  const args = process.argv.slice(2);
  const useAppDatabase = args.includes('--use-app-database');
  const unknownArgs = args.filter((arg) => arg !== '--use-app-database');

  if (unknownArgs.length > 0) {
    throw new Error(`Unknown option: ${unknownArgs[0]}`);
  }

  const mongoUri = useAppDatabase
    ? process.env.MONGO_URI
    : process.env.DEMO_MONGO_URI;

  if (!mongoUri) {
    throw new Error(useAppDatabase
      ? 'MONGO_URI is not configured in this environment'
      : 'Set DEMO_MONGO_URI in backend/.env to a dedicated test/demo database URI');
  }

  const databaseName = getDatabaseName(mongoUri);
  if (!useAppDatabase && !/(demo|test)/i.test(databaseName)) {
    throw new Error(
      'Refusing to seed a database whose name does not include "demo" or "test"'
    );
  }

  if (useAppDatabase) {
    console.log(
      `Using the explicitly requested application database (${databaseName || 'MongoDB default database'}).`
    );
  }

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });

  let release = await Release.findOne({ feature_tag: DEMO_RELEASE_TAG });
  if (!release) {
    release = await Release.create({
      release_name: 'Demo Release - Checkout Improvements',
      feature_tag: DEMO_RELEASE_TAG,
      created_by: 'demo-seed'
    });
  }

  const existingPackage = await ReleasePackage.findOne({
    release_id: release._id,
    package_version: demoPackage.package_version
  });

  if (existingPackage) {
    console.log('Demo data already exists; no changes made.');
  } else {
    if (release.current_package_version !== 0) {
      throw new Error(
        'The demo release has package history but its seed package is missing; refusing to modify it'
      );
    }

    const createdPackage = await ReleasePackage.create({
      release_id: release._id,
      ...demoPackage
    });

    const updatedRelease = await Release.findOneAndUpdate(
      { _id: release._id, current_package_version: 0 },
      {
        $set: {
          current_package_id: createdPackage._id,
          current_package_version: demoPackage.package_version
        }
      },
      { new: true, runValidators: true }
    );

    if (!updatedRelease) {
      throw new Error(
        'Could not set the demo release current package; inspect the database before retrying'
      );
    }

    release = updatedRelease;
    console.log('Created demo release and package.');
  }

  console.log(`Release ID: ${release._id}`);
  console.log('Open the app, select "Demo Release - Checkout Improvements",');
  console.log('then generate a brief from package version 1.');
}

async function main() {
  try {
    await seedDemo();
  } catch (error) {
    const message = String(error.message).replace(
      /\b(mongodb(?:\+srv)?:\/\/)[^@\s]+@/gi,
      '$1[REDACTED]@'
    );
    console.error(`Demo seed failed: ${error.name}: ${message}`);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

main();
