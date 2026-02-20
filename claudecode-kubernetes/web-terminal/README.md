# Web Terminal Backend

Express + WebSocket server that acts as a backend service bridging browser xterm.js clients and K8s sandbox Pods.

## Structure

```
web-terminal/
  src/
    server.ts            # Entry point (Express + WebSocket server)
    types.ts             # Session, AppConfig type definitions
    k8s/
      client.ts          # KubeConfig loading and K8s API client initialization
      pod-template.ts    # Sandbox Pod spec builder
      pod-manager.ts     # Pod create/delete/status management
    ws/
      terminal-bridge.ts # WebSocket <-> K8s exec bridge (core module)
    routes/
      sessions.ts        # REST API router (session CRUD)
  public/                # Static frontend files (xterm.js UI)
  .env.example           # Environment variables example
```

## Dependencies

- `@kubernetes/client-node` - K8s API access (Pod management, exec)
- `express` - HTTP REST API
- `ws` - WebSocket server
- `uuid` - Session ID generation

## Development

```bash
npm install
npm run dev     # tsx watch mode
npm run build   # TypeScript compile
npm start       # Production run
```

## Related

- Docker image: `../docker/web-terminal/Dockerfile`
- K8s deployment: `../k8s-manifests/deployment.yaml`
