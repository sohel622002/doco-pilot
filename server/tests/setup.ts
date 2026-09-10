// These tests never talk to real infrastructure (Supabase is mocked, no
// real JWTs are verified against an external service), so they don't need
// real secrets — just well-formed ones so env.ts's startup validation
// passes in CI, where no .env file exists. Only fills in what's missing,
// so a real local .env still takes precedence.
process.env.JWT_SECRET ??= 'test-jwt-secret'
process.env.MASTER_ENCRYPTION_KEY ??= 'a'.repeat(64)
process.env.SUPABASE_URL ??= 'http://localhost:54321'
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key'
