# apps/ainblockchain-integration/

Directory for the Kubernetes deployment of the AIN Blockchain integration service.

## Related Code

The AIN blockchain integration code is located in the `ainblockchain-integration/` directory within the monorepo. Manifests will be added here once the app is containerized and K8s manifests are ready.

## Future Work

1. Write Dockerfile (`docker/ainblockchain-integration/`)
2. Write Deployment + Service manifests
3. Configure blockchain node connection settings (ConfigMap / Secret)
4. Deploy to the papers-blockchain namespace
