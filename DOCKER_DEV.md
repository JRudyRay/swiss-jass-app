# Development with Docker

## For development with hot reload:
```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

## For production (default):
```bash
docker-compose up
```

## The development override includes:
- NODE_ENV=development
- Source code mounting for hot reload
- npm run dev command