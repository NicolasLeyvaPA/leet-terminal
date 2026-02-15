FROM node:20-alpine AS builder
WORKDIR /app

# Provide a minimal package.json in the builder so the image can be used for
# local development if no project files are bind-mounted. This placeholder
# can be overridden by mounting the project into the container at runtime.
RUN printf '{"name":"leet-terminal-placeholder","version":"0.0.0","scripts":{"dev":"sleep 3600"}}' > package.json

FROM node:20-alpine AS runner
WORKDIR /app

# Copy only the minimal package.json into the final runtime image
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["npm", "run", "dev"]
