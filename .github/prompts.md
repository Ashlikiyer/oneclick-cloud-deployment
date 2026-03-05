# Prompt Templates for One-Click AWS Deployer

## Component Generation Prompts

### Create a new page
```
Create a Next.js 14 App Router page at app/[path]/page.tsx that [description]. 
Use Server Components by default. Include TypeScript types.
```

### Create a client component
```
Create a client component at components/[Name].tsx with "use client" directive.
It should [description]. Style with Tailwind CSS.
```

### Create an API route handler
```
Create an Express route handler at server/routes/[name].js for [HTTP method] /api/[path].
Use async/await and proper error handling. Return JSON responses.
```

### Create an AWS service function
```
Create a function in server/services/ec2Service.js that uses AWS SDK v3 to [action].
Import only the required commands. Handle AWS errors appropriately.
```

## Common Tasks

### Add a new EC2 operation
1. Add function to `server/services/ec2Service.js`
2. Create route handler in `server/routes/`
3. Register route in `server/index.js`
4. Add frontend UI to call the endpoint

### Add real-time feature
1. Emit event from backend using Socket.io
2. Subscribe to event in client component
3. Update component state on event

### Add new environment variable
1. Add to `.env` file
2. Document in `.env.example`
3. Access via `process.env.VAR_NAME` in backend
4. Update documentation
