import('./config/env.js').then(m => {
  const env = m.ENV;
  console.log('PROJECT_ID:', env.FIREBASE_PROJECT_ID);
  console.log('CLIENT_EMAIL:', env.FIREBASE_CLIENT_EMAIL);
  if (env.FIREBASE_CLIENT_EMAIL) {
    const emailProject = env.FIREBASE_CLIENT_EMAIL.split('@')[1]?.split('.')[0];
    console.log('Project ID from Email:', emailProject);
    console.log('Match?', env.FIREBASE_PROJECT_ID === emailProject);
  }
}).catch(console.error);
