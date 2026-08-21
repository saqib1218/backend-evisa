const up = async (db) => {
  // Alter applications table — add new columns
  await db.query(`
    ALTER TABLE applications
      ADD COLUMN IF NOT EXISTS applicant_id VARCHAR(20) UNIQUE,
      ADD COLUMN IF NOT EXISTS processing_type VARCHAR(20) DEFAULT 'standard',
      ADD COLUMN IF NOT EXISTS confirm_info BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS privacy_notice BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS admin_notes TEXT;
  `);

  // Update status default to 'inprogress'
  await db.query(`
    ALTER TABLE applications
      ALTER COLUMN status SET DEFAULT 'inprogress';
  `);

  // Create applicants table — one row per traveller
  await db.query(`
    CREATE TABLE IF NOT EXISTS applicants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL,
      date_of_birth DATE NOT NULL,
      gender VARCHAR(20) NOT NULL,
      country_of_birth VARCHAR(100) NOT NULL,
      nationality VARCHAR(100) NOT NULL,
      passport_number VARCHAR(50) NOT NULL,
      passport_issue_date DATE NOT NULL,
      passport_expiry_date DATE NOT NULL,
      dual_citizenship BOOLEAN DEFAULT false,
      previously_applied_uk BOOLEAN DEFAULT false,
      passport_image_url TEXT,
      personal_photo_url TEXT,
      image_consent BOOLEAN DEFAULT false,
      photo_consent BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_applicants_application_id ON applicants(application_id);
    CREATE INDEX IF NOT EXISTS idx_applicants_email ON applicants(email);
  `);

  // Create payments table — one row per application
  await db.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
      applicant_count INT NOT NULL,
      processing_type VARCHAR(20) NOT NULL,
      fee_per_applicant DECIMAL(10,2) NOT NULL,
      processing_fee_per_applicant DECIMAL(10,2) NOT NULL,
      fee_total DECIMAL(10,2) NOT NULL,
      processing_total DECIMAL(10,2) NOT NULL,
      grand_total DECIMAL(10,2) NOT NULL,
      payment_status BOOLEAN DEFAULT false,
      transaction_id VARCHAR(255),
      paid_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_payments_application_id ON payments(application_id);
    CREATE INDEX IF NOT EXISTS idx_payments_payment_status ON payments(payment_status);
  `);

  // Create application_status_logs table — admin audit trail
  await db.query(`
    CREATE TABLE IF NOT EXISTS application_status_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
      admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
      old_status VARCHAR(50),
      new_status VARCHAR(50) NOT NULL,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_status_logs_application_id ON application_status_logs(application_id);
  `);

  console.log("004 migration: applicants, payments, application_status_logs tables created + applications altered");
};

const down = async (db) => {
  await db.query("DROP TABLE IF EXISTS application_status_logs CASCADE;");
  await db.query("DROP TABLE IF EXISTS payments CASCADE;");
  await db.query("DROP TABLE IF EXISTS applicants CASCADE;");

  await db.query(`
    ALTER TABLE applications
      DROP COLUMN IF EXISTS applicant_id,
      DROP COLUMN IF EXISTS processing_type,
      DROP COLUMN IF EXISTS confirm_info,
      DROP COLUMN IF EXISTS privacy_notice,
      DROP COLUMN IF EXISTS admin_notes;
  `);

  console.log("004 migration: rolled back (applicants, payments, status_logs dropped + applications columns removed)");
};

module.exports = { up, down };
