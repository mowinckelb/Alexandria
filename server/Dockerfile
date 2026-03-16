FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ src/
COPY favicon.png ./
RUN npm run build

FROM node:20-slim
WORKDIR /app
COPY --from=build /app/dist dist/
COPY --from=build /app/node_modules node_modules/
COPY --from=build /app/package.json ./
COPY --from=build /app/favicon.png ./
EXPOSE 3001
CMD ["node", "dist/index.js"]
