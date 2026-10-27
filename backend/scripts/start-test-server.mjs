process.env.NODE_ENV = 'test';
process.env.CODE_RUNNER_ENABLED = 'true';

// Start backend server
await import('../dist/app.js');
