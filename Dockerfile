FROM node:lts-alpine AS builder

WORKDIR /app

COPY package*.json .
RUN npm ci
RUN npm audit fix
COPY . .
RUN npm run build


#
# Production stage.
# This state compile get back the JavaScript code from builder stage
# It will also install the production package only
#
FROM node:lts-alpine AS production-stage
ENV NODE_ENV=production

## We just need the build to execute the command
COPY --from=builder /app/build ./build
# EXPOSE 8080
USER 101
# CMD ["node", "build/index.js"]