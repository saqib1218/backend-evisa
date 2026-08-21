const up = async (db) => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS applications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      reference_number VARCHAR(50) UNIQUE NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'incomplete',
      payment_status BOOLEAN DEFAULT false,
      application_received BOOLEAN DEFAULT false,
      under_review BOOLEAN DEFAULT false,
      final_decision BOOLEAN DEFAULT false,
      submit_date DATE,
      form_data JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);
    CREATE INDEX IF NOT EXISTS idx_applications_reference ON applications(reference_number);
    CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
  `);

  console.log("applications table created");
};

const down = async (db) => {
  await db.query("DROP TABLE IF EXISTS applications CASCADE;");
  console.log("applications table dropped");
};

module.exports = { up, down };
